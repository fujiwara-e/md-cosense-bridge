#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs";
import { getPageText, getCookieFromEnv } from "./api";
import { scrapboxToMarkdown } from "./scrapboxToMarkdown";
import { markdownToScrapbox } from "./markdownToScrapbox";

const program = new Command();

program
  .name("md-cosense-bridge")
  .description(
    "CLI tool to convert between Scrapbox and Markdown (Obsidian) formats",
  )
  .version("1.0.0");

/**
 * Export command: Scrapbox → Markdown
 */
program
  .command("export")
  .description("Export a Scrapbox page to Markdown")
  .argument("<project>", "Scrapbox project name")
  .argument("<page>", "Page title")
  .argument("<output>", "Output markdown file path")
  .option("-c, --cookie <cookie>", "Scrapbox cookie (connect.sid)")
  .action(
    async (
      project: string,
      page: string,
      output: string,
      options: { cookie?: string },
    ) => {
      const cookie = options.cookie || getCookieFromEnv();

      const text = await getPageText(project, page, cookie);
      if (text) {
        const markdown = scrapboxToMarkdown(text);
        fs.writeFileSync(output, markdown, "utf-8");
        console.log(`Exported ${page} to ${output}`);
      } else {
        process.exit(1);
      }
    },
  );

/**
 * Import command: Markdown → Scrapbox
 */
program
  .command("import")
  .description("Convert a Markdown file to Scrapbox format")
  .argument("<project>", "Scrapbox project name (informational)")
  .argument("<page>", "Page title (informational)")
  .argument("<input>", "Input markdown file path")
  .action((project: string, page: string, input: string) => {
    try {
      const markdown = fs.readFileSync(input, "utf-8");
      const scrapboxText = markdownToScrapbox(markdown);

      const outputFilename = "input.txt";
      fs.writeFileSync(outputFilename, scrapboxText, "utf-8");

      console.log(
        `Converted ${input} to Scrapbox format and saved as ${outputFilename}`,
      );
      console.log(
        `(Note: Upload content from ${outputFilename} to ${project}/${page})`,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.error(`Error: File ${input} not found`);
      } else {
        console.error(`Error: ${error}`);
      }
      process.exit(1);
    }
  });

program.parse();
