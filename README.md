# Migrate from Disqus to GitHub Discussions

This is a script to migrate from Disqus to GitHub Discussions which allows you to make use of [giscus](https://giscus.app/) or any other custom integration you might want to use.

## Installation

Follow the next steps to install and configure the script:

- Clone this repository
- Run `npm install`

## Script configuration

- Copy the `.env.example` file to `.env` and fill the variables

| Variable | Description |
| --- | --- |
| `APP_ID` | The ID of the GitHub App |
| `CLIENT_ID` | The client ID of your GitHub App |
| `CLIENT_SECRET` | The client secret of your GitHub App |
| `PRIVATE_KEY_FILE` | The filename of the private key from your GitHub App (this should be placed in the root) |
| `PAT_ACCESS_TOKEN` | The access token of a GitHub user with access to the repository (in case you don't want to use a GitHub App) |
| `OWNER` | The owner ID of the repository |
| `REPOSITORY` | The repository name |
| `XML_FILE` | The filename of the Disqus XML export file (this should be placed in the root) |
| `SITE_URL` | The site URL to process, this will be used to ignore different starting paths like Google translate, cache, ... |
| `CATEGORY_NAME` | The name of the discussion category to which the new discussions get created |
| `API_RETRIES` | The number of retries to make in case of an error |
| `SLEEP_TIME` | The time to sleep between creating comments/replies |
| `DEBUG` | Set to `TRUE` to show Github API (error) responses |

### GitHub App

The preferred way to authenticate is by using a GitHub App as depending on the number of comments you have, you might hit the rate limit of the GitHub API. Make sure you give the GitHub App the following permissions:

- **Discussions**: Read & Write

Install the GitHub App to the repository you want to migrate to and copy the client ID, client secret, and private key to the `.env` file.

### Personal Access Token

The other way to authenticate is by using a personal access token, it is the easiest approach, but might temporarily block your GitHub API usage.

You will need to create a classic token (as the GraphQL API doesn't support the fine-grained tokens yet) with the following permissions:

- `public_repo:read`
- `write:discussion`

## GitHub discussion configuration

To make use of the script, you need to configure the GitHub repository to allow discussions. Make sure this feature is enabled, and that you create the category you want to use for the discussions.

## Usage

Once you configured the project, you can run the script with `npm start`.

![](./assets/output.png)

### Progress

The progress is saved in the `progress.json` file, so you can stop the script and continue later. The file will contain all the thread, comment, and reply ID mappings.

> **Info**: When the script would fail, you can run it again, and it will skip the already processed comments.

### Errors

When an error occurs while creating a comment or reply, it will be saved in the `errors.log` file. You can then manually create the comment or reply in the GitHub discussion.