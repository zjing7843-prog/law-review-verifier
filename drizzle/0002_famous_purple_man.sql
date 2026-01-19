CREATE TABLE `llmSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('manus','openai','anthropic') NOT NULL DEFAULT 'manus',
	`apiKey` text,
	`modelName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `llmSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `llmSettings_userId_unique` UNIQUE(`userId`)
);
