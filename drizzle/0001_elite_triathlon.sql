CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(10) NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`totalFootnotes` int,
	`extractedFootnotes` int,
	`status` enum('uploaded','extracting','extracted','correcting','corrected','validating','completed','error') NOT NULL DEFAULT 'uploaded',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `footnotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`number` int NOT NULL,
	`article` text,
	`authors` text,
	`year` varchar(10),
	`originalText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `footnotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verificationResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`footnoteId` int NOT NULL,
	`status` enum('correct','incorrect','unsure') NOT NULL,
	`explanation` text,
	`searchResults` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verificationResults_id` PRIMARY KEY(`id`)
);
