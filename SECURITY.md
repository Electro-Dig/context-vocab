# Security Policy

## API Keys

Context Vocab does not include a DeepSeek API key. Users provide their own key in the extension Options page, and the key is stored in `chrome.storage.local`.

Do not commit real API keys, exported browser storage, private wordbooks, browsing history, `.env` files, or screenshots containing secrets.

## Data Flow

The extension sends selected text and nearby context only to the endpoint configured by the user. There is no project-owned backend service in this repository.

## Reporting Issues

Please open a GitHub issue for security or privacy concerns that do not expose private data. If an issue includes credentials or sensitive personal data, revoke the credential first and avoid posting the secret publicly.
