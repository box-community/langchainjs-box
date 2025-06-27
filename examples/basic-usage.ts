import { BoxLoader, BoxAuth, BoxAuthType } from '../src';

async function main() {
  // Example 1: Using explicit developer token
  
  console.log('=== Example 1: Developer Token ===');
  
  const auth1 = new BoxAuth({
    authType: BoxAuthType.TOKEN,
    boxDeveloperToken: 'TOKEN'
  });

  const loader1 = new BoxLoader({
    boxAuth: auth1,
    boxFileIds: ['FILE_ID_1', 'FILE_ID_2'],
    characterLimit: 1000
  });

  try {
    const docs1 = await loader1.load();
    console.log(`Loaded ${docs1.length} documents`);
    docs1.forEach(doc => {
      console.log(`- ${doc.metadata.file_name} (${doc.metadata.file_size} bytes)`);
      console.log(doc.pageContent);
    });
  } catch (error) {
    console.error('Error loading documents:', error);
  }

  // Example 2: Using BoxAuth with explicit token

  console.log('\n=== Example 2: Explicit Authentication ===');
  
  const auth = new BoxAuth({
    authType: BoxAuthType.TOKEN,
    boxDeveloperToken: 'TOKEN'
  });

  const loader2 = new BoxLoader({
    boxAuth: auth,
    boxFolderId: 'FOLDER_ID',
    recursive: true
  });

  try {
    const docs2 = await loader2.load();
    console.log(`Loaded ${docs2.length} documents from folder`);
  } catch (error) {
    console.error('Error loading from folder:', error);
  }

  // Example 3: Lazy loading
  console.log('\n=== Example 3: Lazy Loading ===');
  
  const auth3 = new BoxAuth({
    authType: BoxAuthType.TOKEN,
    boxDeveloperToken: 'TOKEN'
  });

  const loader3 = new BoxLoader({
    boxAuth: auth3,
    boxFolderId: 'FOLDER_ID'
  });

  try {
    let count = 0;
    for await (const doc of loader3.lazyLoad()) {
      count++;
      console.log(`Document ${count}: ${doc.metadata.file_name}`);
    }
  } catch (error) {
    console.error('Error with lazy loading:', error);
  }
}

// Run the example
main().catch(console.error); 