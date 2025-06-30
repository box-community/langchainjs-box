import { BoxLoader, BoxAuth, BoxAuthType } from '../src';

async function main() {
  // Example 1: Using explicit developer token
  
  // console.log('=== Example 1: Developer Token ===');
  
  // const auth1 = new BoxAuth({
  //   authType: BoxAuthType.TOKEN,
  //   boxDeveloperToken: 'DEVELOPER_TOKEN'
  // });

  // const loader1 = new BoxLoader({
  //   boxAuth: auth1,
  //   boxFileIds: ['FILE_ID_1', 'FILE_ID_2'],
  //   characterLimit: 1000
  // });

  // try {
  //   const docs1 = await loader1.load();
  //   console.log(`Loaded ${docs1.length} documents`);
  //   docs1.forEach(doc => {
  //     console.log(`- ${doc.metadata.file_name} (${doc.metadata.file_size} bytes)`);
  //     console.log(doc.pageContent);
  //   });
  // } catch (error) {
  //   console.error('Error loading documents:', error);
  // }

  // Example 2: Using BoxAuth with explicit token

  // console.log('\n=== Example 2: Explicit Authentication ===');
  
  // const auth = new BoxAuth({
  //   authType: BoxAuthType.TOKEN,
  //   boxDeveloperToken: 'TOKEN'
  // });

  // const loader2 = new BoxLoader({
  //   boxAuth: auth,
  //   boxFolderId: 'FOLDER_ID',
  //   recursive: true
  // });

  // try {
  //   const docs2 = await loader2.load();
  //   console.log(`Loaded ${docs2.length} documents from folder`);
  // } catch (error) {
  //   console.error('Error loading from folder:', error);
  // }

  // Example 3: Lazy loading
  // console.log('\n=== Example 3: Lazy Loading ===');
  
  // const auth3 = new BoxAuth({
  //   authType: BoxAuthType.TOKEN,
  //   boxDeveloperToken: 'TOKEN'
  // });

  // const loader3 = new BoxLoader({
  //   boxAuth: auth3,
  //   boxFolderId: 'FOLDER_ID'
  // });

  // try {
  //   let count = 0;
  //   for await (const doc of loader3.lazyLoad()) {
  //     count++;
  //     console.log(`Document ${count}: ${doc.metadata.file_name}`);
  //   }
  // } catch (error) {
  //   console.error('Error with lazy loading:', error);
  // }

  // Example 4: Using JWT authentication
  console.log('\n=== Example 4: JWT Authentication ===');

  const auth4 = new BoxAuth({
    authType: BoxAuthType.JWT,
    boxJwtPath: 'path/to/jwt.json',
  });

  const loader4 = new BoxLoader({
    boxAuth: auth4,
    boxFileIds: ['FILE_ID_1', 'FILE_ID_2'],
  });

  try {
    const docs4 = await loader4.load();
    console.log(`Loaded ${docs4.length} documents`);
    docs4.forEach(doc => {
      console.log(doc.pageContent);
    });
  } catch (error) {
    console.error('Error loading documents:', error);
  }

  // Example 5: Using CCG authentication
  // console.log('\n=== Example 5: CCG Authentication ===');

  // const auth5 = new BoxAuth({
  //   authType: BoxAuthType.CCG,
  //   boxClientId: 'w9zxo68hdvpdhn18uzdcvg2azndgnww1',
  //   boxClientSecret: 'hs5mvdsc2p444h2Re6cLZgh0WZXDdEkt',  
  //   boxUserId: '21278765957'
  // });

  // const loader5 = new BoxLoader({
  //   boxAuth: auth5,
  //   boxFileIds: ['1907108576823', '1907091064765'],
  // });

  // try {
  //   const docs5 = await loader5.load();
  //   console.log(docs5);
  //   console.log(`Loaded ${docs5.length} documents`);
  //   docs5.forEach(doc => {
  //     console.log(doc.pageContent);
  //   });
  // } catch (error) {
  //   console.error('Error loading documents:', error);
  // }
}
// Run the example
main().catch(console.error);
