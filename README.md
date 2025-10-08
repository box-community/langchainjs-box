# @langchainjs-box

This package contains the Box document loader for LangChain.js. For more information about Box, check out our [developer documentation](https://developer.box.com/).

## Pre-requisites

In order to integrate with Box, you need a few things:

- A Box instance — if you are not a current Box customer, [sign up for a free dev account](https://developer.box.com/)
- A Box app — more on how to [create an app](https://developer.box.com/guides/applications/)
- Your app approved in your Box instance — This is done by your Box admin. The good news is if you are using a free developer account, you are the admin. [Authorize your app](https://developer.box.com/guides/authorization/)
- Node.js >= 20

## Installation

```bash
npm install @langchainjs-box @langchain/core
```

## Authentication

The `@langchainjs-box` package offers some flexibility to authentication. The most basic authentication method is by using a developer token. This can be found in the [Box developer console](https://app.box.com/developers/console) on the configuration screen. This token is purposely short-lived (1 hour) and is intended for development. With this token, you can add it to your environment as `BOX_DEVELOPER_TOKEN`, you can pass it directly to the loader, or you can use the `BoxAuth` authentication helper class.

### BoxAuth helper class

`BoxAuth` supports the following authentication methods:

- Token — either a developer token or any token generated through the Box SDK
- JWT with a service account
- JWT with a specified user
- CCG with a service account
- CCG with a specified user

> **Note:** If using JWT authentication, you will need to download the configuration from the Box developer console after generating your public/private key pair. Place this file in your application directory structure somewhere. You will use the path to this file when using the `BoxAuth` helper class.

For more information, learn about how to [set up a Box application](https://developer.box.com/guides/applications/), and check out the [Box authentication guide](https://developer.box.com/guides/authentication/) for more about our different authentication options.

### Examples:

**Token**

```typescript
import { BoxLoader, BoxAuth, BoxAuthType } from '@langchainjs-box';

const auth = new BoxAuth({
  authType: BoxAuthType.TOKEN,
  boxDeveloperToken: 'DEVELOPER_TOKEN'
});

const loader = new BoxLoader({
  boxAuth: auth,
  boxFileIds: ['12345', '67890']
});

const docs = await loader.load();
```

**JWT with a service account**

```typescript
import { BoxLoader, BoxAuth, BoxAuthType } from '@langchainjs-box';

const auth = new BoxAuth({
  authType: BoxAuthType.JWT,
  boxJwtPath: './path/to/jwt-config.json'
});

const loader = new BoxLoader({
  boxAuth: auth,
  boxFolderId: 'FOLDER_ID'
});

const docs = await loader.load();
```

**JWT with a specified user**

```typescript
import { BoxLoader, BoxAuth, BoxAuthType } from '@langchainjs-box';

const auth = new BoxAuth({
  authType: BoxAuthType.JWT,
  boxJwtPath: './path/to/jwt-config.json',
  boxUserId: 'USER_ID'
});

const loader = new BoxLoader({
  boxAuth: auth,
  boxFolderId: 'FOLDER_ID'
});

const docs = await loader.load();
```

**CCG with a service account**

```typescript
import { BoxLoader, BoxAuth, BoxAuthType } from '@langchainjs-box';

const auth = new BoxAuth({
  authType: BoxAuthType.CCG,
  boxClientId: 'your_client_id',
  boxClientSecret: 'your_client_secret',
  boxEnterpriseId: 'your_enterprise_id'
});

const loader = new BoxLoader({
  boxAuth: auth,
  boxFolderId: 'FOLDER_ID'
});

const docs = await loader.load();
```

**CCG with a specified user**

```typescript
import { BoxLoader, BoxAuth, BoxAuthType } from '@langchainjs-box';

const auth = new BoxAuth({
  authType: BoxAuthType.CCG,
  boxClientId: 'your_client_id',
  boxClientSecret: 'your_client_secret',
  boxUserId: 'user_id_here'
});

const loader = new BoxLoader({
  boxAuth: auth,
  boxFolderId: 'FOLDER_ID'
});

const docs = await loader.load();
```

## Document Loaders

The `BoxLoader` class helps you get your unstructured content from Box in LangChain's `Document` format. You can do this with either an array of Box file IDs, or with a Box folder ID.

If getting files from a folder with folder ID, you can also set a boolean to tell the loader to get all sub-folders in that folder, as well.

> **Info:** A Box instance can contain Petabytes of files, and folders can contain millions of files. Be intentional when choosing what folders you choose to index. And we recommend never getting all files from folder 0 recursively. Folder ID 0 is your root folder.

### Load files

```typescript
import { BoxLoader } from '@langchainjs-box';

// Using environment variable BOX_DEVELOPER_TOKEN
process.env.BOX_DEVELOPER_TOKEN = 'your_developer_token_here';

const loader = new BoxLoader({
  boxFileIds: ['FILE_ID_1', 'FILE_ID_2'],
  characterLimit: 10000  // Optional. Defaults to no limit
});

const docs = await loader.load();
```

### Load from folder

```typescript
import { BoxLoader } from '@langchainjs-box';

// Using environment variable BOX_DEVELOPER_TOKEN
process.env.BOX_DEVELOPER_TOKEN = 'your_developer_token_here';

const loader = new BoxLoader({
  boxFolderId: 'FOLDER_ID',
  recursive: false,  // Optional. return entire tree, defaults to false
  characterLimit: 10000  // Optional. Defaults to no limit
});

const docs = await loader.load();
```

### Lazy loading

```typescript
import { BoxLoader } from '@langchainjs-box';

const loader = new BoxLoader({
  boxFolderId: 'FOLDER_ID'
});

// Load documents one by one
for await (const doc of loader.lazyLoad()) {
  console.log(doc.metadata.file_name);
  // Process each document
}
```

## Environment Variables

You can set the following environment variables:

- `BOX_DEVELOPER_TOKEN` - Developer token from Box console
- `BOX_JWT_PATH` - Path to JWT configuration file
- `BOX_USER_ID` - User ID for user-specific authentication
- `BOX_CLIENT_ID` - Client ID for CCG authentication
- `BOX_CLIENT_SECRET` - Client secret for CCG authentication
- `BOX_ENTERPRISE_ID` - Enterprise ID for enterprise CCG authentication

## Error Handling

The loader includes error handling for common scenarios:

- Files that cannot be read (binary files, permission issues)
- Network connectivity issues
- Authentication failures
- Invalid file or folder IDs

When errors occur, the loader will log warnings but continue processing other files.

### Markdown representation support

For the following file types, the loader requests Box's markdown representation (REPRESENTATION_TYPE="markdown") for improved formatting:

- Microsoft Office: `.docx`, `.pptx`, `.xls`, `.xlsx`, `.xlsm`
- Google Workspace: `.gdoc`, `.gslide`, `.gslides`, `.gsheet`
- PDF: `.pdf`

For other supported text-like files, the loader falls back to the extracted text representation.

## License

MIT 