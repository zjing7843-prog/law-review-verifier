import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { extractDocxText, extractPdfText, downloadFile, extractFootnotes } from './documentProcessor';
import { extractFootnotesWithLLM } from './llmFootnoteExtractor';
import { categorizeCitationsBatch, CitationCategorySchema } from "./citationCategorizer";
import { uploadFileToS3 } from "./fileUpload";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  citations: router({
    categorize: publicProcedure
      .input(z.object({
        citations: z.array(z.string())
      }))
      .mutation(async ({ ctx, input }) => {
        // Pass userId if authenticated, otherwise use Manus LLM
        const userId = ctx.user?.id;
        const results = await categorizeCitationsBatch(input.citations, userId);
        return results.map((result, index) => ({
          citation: input.citations[index],
          category: result.category,
          confidence: result.confidence
        }));
      }),
  }),

  llm: router({
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const settings = await db.getLlmSettingByUserId(ctx.user.id);
        return settings || { provider: "manus", apiKey: null, modelName: null };
      }),
    
    saveSettings: protectedProcedure
      .input(z.object({
        provider: z.enum(["manus", "openai", "anthropic"]),
        apiKey: z.string().optional(),
        modelName: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertLlmSetting({
          userId: ctx.user.id,
          provider: input.provider,
          apiKey: input.apiKey || null,
          modelName: input.modelName || null
        });
        return { success: true };
      }),
  }),

  documents: router({
    uploadFile: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // base64 encoded file data
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Decode base64 file data
        const buffer = Buffer.from(input.fileData, 'base64');
        
        // Upload to S3
        const result = await uploadFileToS3(
          ctx.user.id,
          input.fileName,
          buffer,
          input.contentType
        );
        
        return result;
      }),
    
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.enum(['pdf', 'docx']),
        fileUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createDocument({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileType: input.fileType,
          fileKey: `${ctx.user.id}/${Date.now()}-${input.fileName}`,
          fileUrl: input.fileUrl,
          status: 'uploaded',
        });
        return result;
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentById(input.id);
      }),
    
    getFootnotes: protectedProcedure
      .input(z.object({
        documentId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getFootnotesByDocumentId(input.documentId);
      }),
    
    getVerificationResults: protectedProcedure
      .input(z.object({
        documentId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getVerificationResultsByDocumentId(input.documentId);
      }),
    
    extractFootnotes: protectedProcedure
      .input(z.object({
        documentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Get document from database
        const document = await db.getDocumentById(input.documentId);
        if (!document) {
          throw new Error('Document not found');
        }
        
        // Download file
        const buffer = await downloadFile(document.fileUrl);
        
        // Extract text based on file type
        let text = '';
        if (document.fileType === 'pdf') {
          text = await extractPdfText(buffer);
        } else {
          text = await extractDocxText(buffer);
        }
        
        // Extract footnotes using LLM for better accuracy
        console.log('[extractFootnotes] Using LLM-based extraction for accurate footnote identification');
        const footnotes = await extractFootnotesWithLLM(text);
        
        // Save footnotes to database
        const footnoteData = footnotes.map(fn => ({
          documentId: document.id,
          number: fn.number,
          text: fn.text,
          article: fn.article,
          authors: fn.authors,
          year: fn.year,
        }));
        await db.createFootnotes(footnoteData);
        
        // Update document status
        await db.updateDocumentStatus(document.id, 'extracted');
        
        return { 
          success: true, 
          footnoteCount: footnotes.length,
          footnotes 
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
