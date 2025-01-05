const { replaceInFile } = require('replace-in-file');  // Correct import syntax for the function

// Function to replace URLs in the generated bundle
async function replacePlaceholders() {
  try {
    const results = await replaceInFile({
      files: './dist/*.js',  // Ensure the correct output file path
      from: [
        /draco_decoder\.wasm/g,  // Replace original wasm file names
        /draco_wasm_wrapper\.js/g,
        /draco_decoder\.js/g,
      ],
      to: [
        'https://play2.s3.amazonaws.com/assets/vn4YjGnNY.wasm',
        'https://play2.s3.amazonaws.com/assets/PTcU1jRMs.js',
        'https://play2.s3.amazonaws.com/assets/_f5hQEuDW.js',
      ],
    });

    console.log('Replacement results:', results);
  } catch (error) {
    console.error('Error occurred:', error);
  }
}

// Run the replacement
replacePlaceholders();
