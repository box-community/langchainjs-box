# Development Notes

## Overview

This is a LangChain.js connector for Box, based on the Python implementation available at https://pypi.org/project/langchain-box/. 

## Architecture

The package is structured as follows:

- `src/types.ts` - TypeScript types and interfaces, including the BoxAuth class
- `src/document_loaders.ts` - The main BoxLoader class
- `src/utilities.ts` - Utility functions for common operations
- `src/index.ts` - Main export file
- `examples/` - Usage examples

## Key Features

### Authentication Support
- Developer Token (for development)
- JWT with service account or specific user
- CCG (Client Credentials Grant) with service account or specific user

### Document Loading
- Load files by ID
- Load files from folders (with optional recursion)
- Character limits for content
- Lazy loading support
- Rich metadata extraction

### Error Handling
- Graceful handling of unreadable files
- Network error resilience
- Authentication failure handling

## Implementation Notes

### Modern Box SDK
The package uses the next-generation [`box-node-sdk` (v10+)](https://github.com/box/box-node-sdk/tree/sdk-gen), which is auto-generated and provides:

- Full TypeScript support with embedded docs
- Complete API coverage with rapid updates
- Modern authentication patterns and convenience methods
- Better error handling and reliability

### TypeScript Compatibility
The new Box TypeScript SDK Gen provides complete TypeScript definitions out of the box, eliminating the need for custom type definitions.

### LangChain Integration
The package follows LangChain.js patterns:
- Extends `BaseDocumentLoader`
- Returns `Document` objects with proper metadata
- Supports both `load()` and `lazyLoad()` methods

## Building and Testing

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

## Usage Patterns

### Environment Variables
The package supports these environment variables:
- `BOX_DEVELOPER_TOKEN` - Developer token from Box console
- `BOX_JWT_PATH` - Path to JWT configuration file
- `BOX_USER_ID` - User ID for user-specific authentication
- `BOX_CLIENT_ID` - Client ID for CCG authentication
- `BOX_CLIENT_SECRET` - Client secret for CCG authentication
- `BOX_ENTERPRISE_ID` - Enterprise ID for enterprise CCG authentication

### Authentication Precedence
1. Explicit `boxClient` parameter
2. Explicit `boxAuth` parameter
3. `BOX_DEVELOPER_TOKEN` environment variable
4. Other environment variables for JWT/CCG

## Error Scenarios

The package handles these error scenarios gracefully:
- Missing Box SDK dependency
- Invalid authentication credentials
- Network connectivity issues
- Files that cannot be read (binary files, permissions)
- Invalid file or folder IDs
- Rate limiting (through Box SDK)

## Performance Considerations

- Uses streaming for file content to handle large files
- Supports character limits to prevent memory issues
- Lazy loading for processing large folders
- Pagination for folder listings

## Security Considerations

- Never logs authentication tokens
- Supports all Box security models
- JWT configuration files should not be committed to version control
- Developer tokens are short-lived (1 hour)

## Future Enhancements

Potential future features:
- Support for Box AI integration
- Enhanced metadata extraction
- Support for Box Notes and other special file types
- Webhook integration for real-time updates
- Caching mechanisms for improved performance 