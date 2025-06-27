# Quick Start Guide

## Installation

1. Install the package and its peer dependency:
```bash
npm install @langchain/box box-typescript-sdk-gen
```

2. Set up your Box developer token:
   - Go to the [Box Developer Console](https://app.box.com/developers/console)
   - Create a new app or select an existing one
   - Copy your Developer Token from the Configuration tab
   - Set it as an environment variable:
```bash
export BOX_DEVELOPER_TOKEN="your_token_here"
```

## Basic Usage

### Load specific files

```typescript
import { BoxLoader } from '@langchain/box';

const loader = new BoxLoader({
  boxFileIds: ['123456789', '987654321']
});

const documents = await loader.load();
console.log(`Loaded ${documents.length} documents`);
```

### Load from a folder

```typescript
import { BoxLoader } from '@langchain/box';

const loader = new BoxLoader({
  boxFolderId: '123456789',
  recursive: false  // Set to true to include subfolders
});

const documents = await loader.load();
```

### Use with explicit authentication

```typescript
import { BoxLoader, BoxAuth, BoxAuthType } from '@langchain/box';

const auth = new BoxAuth({
  authType: BoxAuthType.TOKEN,
  boxDeveloperToken: 'your_token_here'
});

const loader = new BoxLoader({
  boxAuth: auth,
  boxFolderId: '123456789'
});

const documents = await loader.load();
```

## Document Structure

Each loaded document has the following structure:

```typescript
{
  pageContent: "File content as text...",
  metadata: {
    source: "box://file/123456789",
    file_id: "123456789",
    file_name: "document.txt",
    file_type: "txt",
    file_size: 1024,
    created_at: "2024-01-01T00:00:00Z",
    modified_at: "2024-01-01T00:00:00Z",
    box_url: "https://app.box.com/file/123456789"
  }
}
```

## Common Use Cases

### With LangChain for RAG

```typescript
import { BoxLoader } from '@langchain/box';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

// Load documents from Box
const loader = new BoxLoader({
  boxFolderId: 'your_folder_id',
  characterLimit: 10000
});

const documents = await loader.load();

// Split into chunks
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const splits = await textSplitter.splitDocuments(documents);

// Create vector store
const embeddings = new OpenAIEmbeddings();
const vectorStore = await MemoryVectorStore.fromDocuments(splits, embeddings);

// Use for similarity search
const results = await vectorStore.similaritySearch("your query", 4);
```

### Processing large folders with lazy loading

```typescript
import { BoxLoader } from '@langchain/box';

const loader = new BoxLoader({
  boxFolderId: 'large_folder_id',
  recursive: true
});

// Process documents one by one to avoid memory issues
for await (const document of loader.lazyLoad()) {
  console.log(`Processing: ${document.metadata.file_name}`);
  // Process each document individually
  await processDocument(document);
}
```

## Troubleshooting

### Error: "box-typescript-sdk-gen is not installed"
Install the Box SDK: `npm install box-typescript-sdk-gen`

### Error: "Must provide either boxAuth or boxClient"
Set the `BOX_DEVELOPER_TOKEN` environment variable or provide authentication explicitly.

### Error: "Failed to authenticate"
- Check that your developer token is valid and not expired
- Ensure your Box app is authorized in your Box instance
- For JWT/CCG, verify your configuration is correct

### Files showing empty content
- Some file types (images, PDFs) may not have readable text content
- Binary files will have empty content but metadata will still be populated
- Check file permissions in Box

## Next Steps

- Check out the [full examples](./examples/) for more advanced usage
- Read the [development notes](./DEVELOPMENT.md) for implementation details
- See the [Box Developer Documentation](https://developer.box.com/) for Box API details 