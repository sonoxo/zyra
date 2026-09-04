# XuniDirect YouTube Cleaner Privacy Policy

**Last updated:** September 4, 2026

XuniDirect YouTube Cleaner is a Chrome extension for reviewing and managing the authenticated user's own YouTube subscriptions.

## Data XuniDirect accesses

XuniDirect requests Google OAuth authorization for the YouTube Data API. After the user grants access, the extension may access subscription metadata required for its single purpose, including channel titles, channel identifiers, subscription identifiers, and the date/time the user subscribed.

XuniDirect uses that information only to display, filter, select, and execute user-confirmed unsubscribe actions for the signed-in user's own YouTube account.

## Authentication

Authentication is performed through Google's OAuth 2.0 / Chrome Identity flow. XuniDirect does not ask users to type their Google password into the extension and does not embed a Google OAuth client secret in extension code.

## Storage

XuniDirect may use Chrome extension storage for local preferences such as date filters, channel-name filters, and lightweight interface state. The current extension architecture does not require a developer-controlled backend to store YouTube subscription metadata.

## Data sharing and sale

XuniDirect does not sell Google user data, does not use Google user data for personalized advertising, and does not transfer Google user data to data brokers or unrelated third parties.

## Browser data

XuniDirect does not collect browser history, browsing activity across unrelated websites, passwords, financial information, health information, precise location, or personal communications.

## Unsubscribe actions

XuniDirect does not perform background or autonomous bulk unsubscribe actions. The user must scan/filter subscriptions, review the candidate set, select the desired subscriptions, and explicitly confirm before deletion requests are sent to the YouTube Data API.

## Retention and deletion

Subscription information retrieved for the management interface is used for the active extension workflow. Users may clear local extension state by removing the extension or clearing its stored data, and may revoke Google authorization through their Google Account permissions.

## Google API Limited Use

XuniDirect's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements, and to applicable Chrome Web Store User Data policies.

## Security

The extension uses Manifest V3 and packages its executable extension logic locally. It does not download and execute remote JavaScript.

## Contact / support

Support and issue reporting are provided through the XuniDirect project area in the public `sonoxo/zyra` GitHub repository.

XuniDirect, XUNIA, ZYRA, and Black House are project/software architecture names. References to Google, Chrome, YouTube, or their APIs describe interoperability and do not imply endorsement, certification, or partnership.
