# Chrome Web Store Privacy Tab — prepared answers

## Single purpose
Review and manage the signed-in user's own YouTube subscriptions by subscription date or channel name, with preview and explicit confirmation before unsubscribe actions.

## Permission justification — identity
Required to authenticate the user through Google's Chrome Identity/OAuth flow and obtain authorization to call the YouTube Data API on the signed-in user's behalf.

## Permission justification — storage
Used only for local extension preferences and lightweight interface state such as date filters and channel-name filters. XuniDirect does not require a developer-controlled cloud database for YouTube subscription metadata.

## Host permission justification — https://www.googleapis.com/*
Required to call Google API endpoints used by the YouTube Data API. The extension does not use this permission to read arbitrary website pages.

## Remote code
No. All executable extension logic is included in the Manifest V3 extension package. XuniDirect does not download or execute remote JavaScript.

## Data handling disclosure
XuniDirect accesses YouTube subscription metadata needed for its single purpose, including channel title, channel ID, subscription ID, and subscription creation timestamp. This data is used to display/filter the user's subscription list and to execute user-confirmed unsubscribe requests.

## Data sale / advertising
No Google user data is sold or used for personalized advertising.

## Browsing history
Not collected.

## Location
Not collected.

## Financial / health / communications
Not collected.

## Limited Use
Certify only if the submitted production build continues to match this package: XuniDirect's use of information received from Google APIs adheres to the Google API Services User Data Policy, including Limited Use requirements.