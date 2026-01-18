import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

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

  documents: router({
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
    
    extractFootnotes: protectedProcedure
      .input(z.object({
        documentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // This will be implemented with actual extraction logic
        return { success: true, footnotes: [] };
      }),
  }),
});

export type AppRouter = typeof appRouter;
