import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * 環境変数からCookieを取得
 */
export function getCookieFromEnv(): string | undefined {
  return process.env.COOKIE;
}

/**
 * ScrapboxからページのテキストをPlain Text形式で取得
 */
export async function getPageText(
  projectName: string,
  pageTitle: string,
  cookie?: string,
): Promise<string | null> {
  if (!cookie) {
    cookie = getCookieFromEnv();
  }

  const encodedTitle = encodeURIComponent(pageTitle);
  const url = `https://scrapbox.io/api/pages/${projectName}/${encodedTitle}/text`;

  console.log(`Requesting: ${url}`);

  try {
    const headers: Record<string, string> = {};
    if (cookie) {
      headers["Cookie"] = `connect.sid=${cookie}`;
    }

    const response = await axios.get(url, { headers });
    console.log(`Status code: ${response.status}`);

    if (response.status === 200) {
      return response.data;
    } else {
      console.log(`Response content: ${response.data}`);
      console.log(`Error: Failed to get page ${pageTitle} from ${projectName}`);
      return null;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(`Status code: ${error.response?.status}`);
      console.log(`Response content: ${error.response?.data}`);
      console.log(`Error: Failed to get page ${pageTitle} from ${projectName}`);
    } else {
      console.log(`Error: ${error}`);
    }
    return null;
  }
}
