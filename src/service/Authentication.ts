import { createAppAuth } from "@octokit/auth-app";
import { readFileSync } from "fs";
import { join } from "path";
import fetch from "node-fetch";

export class Authentication {
  private static _token: string = "";

  public static get token() {
    return this._token;
  }

  public static async getToken() {
    const appId = process.env.APP_ID || "";
    const clientId = process.env.CLIENT_ID || "";
    const clientSecret = process.env.CLIENT_SECRET || "";
    const privateKeyFile = process.env.PRIVATE_KEY_FILE || "";
    const patAccessToken = process.env.PAT_ACCESS_TOKEN || "";

    if (appId && clientId && clientSecret) {
      if (!privateKeyFile) {
        throw new Error("PRIVATE_KEY_FILE environment variable is not set");
      }

      console.log(`Getting app access token...`);
    
      const auth = createAppAuth({
        appId,
        privateKey: readFileSync(join(__dirname, "../../", privateKeyFile), "utf8"),
        clientId,
        clientSecret
      });

      // Retrieve JSON Web Token (JWT) to authenticate as app
      const appAuthentication = await auth({ type: "app" });

      const installationResponse = await fetch("https://api.github.com/app/installations", {
        method: 'GET',
        headers: { Authorization: `Bearer ${appAuthentication.token}` }
      });

      if (!installationResponse.ok) {
        throw new Error(`HTTP error! status: ${installationResponse.status}`);
      }

      const installations = await installationResponse.json();

      const installationId = installations[0].id;

      // Get installation access token
      const installationAuthentication = await auth({
        type: "installation",
        installationId,
      });

      console.log(`- App access token retrieved`);
      console.log(``);

      this._token = installationAuthentication?.token;

      return installationAuthentication?.token;
    } else if (patAccessToken) {
      console.log(`Using PAT access token...`);
      console.log(``);

      this._token = patAccessToken;

      return patAccessToken;
    } else {
      throw new Error("Provide the environment variables for either PAT or App authentication");
    }
  }
}