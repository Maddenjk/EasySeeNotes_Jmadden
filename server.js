const { TextractClient, DetectDocumentTextCommand } = require("@aws-sdk/client-textract");
const express = require("express");
const cors = require('cors');
const {PDFDocument} = require('pdf-lib'); 
const { Upload } = require ("@aws-sdk/lib-storage");

const app = express();
const port = 5000;
app.use(cors());
app.use(express.json({limit: '50mb'}));
// Set it up so we can pass the pdf to the server
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
app.listen(5000, '0.0.0.0', () => {
  console.log("Listening on port 5000");
});
const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3Client = new S3Client();

// The bucket where the files go
const bucketName = "easyseenotes";

// We need to keep the data and file name saved back here for
// saving the file 
let data = ""
let filename = ""

// Send the file to s3
const sendFile =async () =>{
  console.log(data)
     const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: filename,
        Body: data,
      },
    });

    upload.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    await upload.done();
}

// Get the file from s3
const getFile = async (objectKey) =>{
    const data = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: objectKey }));
    result = await data.Body.transformToString();
    // Split up the text into an array
    result = result.split("\n")
    return result;
}

// Get the list of saved files from S3
async function listS3FileNames() {
  try {
    const command = new ListObjectsV2Command({ Bucket: bucketName });
    const response = await s3Client.send(command);

    // If we got the files
    if (response.Contents) {
      // Map out their keys (which are the names)
      const fileNames = response.Contents.map(file => file.Key);
      return fileNames;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error listing filenames:", error);
    throw error;
  }
}

// Read the PDF into text
const readPDF = async (file) =>{
  result = []
  try{
    data = ""
    // Load pdf into PDFDocument
    const pdf = await PDFDocument.load(file);
    // Get the number of pages
    const numberOfPages = pdf.getPages().length;
    // DetectDocumentTextCommand can only handle one page at a time
    for (let i = 0; i < numberOfPages; i++) {
      // New pdf to temporarily save the page
      const newPdf = await PDFDocument.create();
      // Copy just this one page
      const [copiedPage] = await newPdf.copyPages(pdf, [i]);
      // Add it to the temp pdf
      newPdf.addPage(copiedPage);
      // Get the bytes
      const pdfBytes = await newPdf.save();
      // Read the page text
      result.push(await readPage(pdfBytes));
      // Use this to set a line between pages
      result.push([[]]);
    }
  }
  catch (error) {
    console.error('error:', error);
  }
  return result
}


// Read the page text
const readPage = async (fileImage) =>{
  try {
    const client = new TextractClient();
    const input = { 
      Document: { 
        Bytes: fileImage
      },
    };
    const command = new DetectDocumentTextCommand(input);
    const response = await client.send(command);

    // Fiter out only line elements from the blocks
    const filteredObjects = response.Blocks.filter(obj => {
      // This turns the block into an array
      const values = Object.values(obj);  
      // Go through the values and return the LINE element 
      return values.some(value => {
        // If the value is an array
        if (Array.isArray(value)) {
          return value.includes("LINE");
        }
        // If the value is a string
        return typeof value === 'string' && value.includes("LINE");
  }); 
    });
    // Split the inner filtered objects text lines into an array
    const text = filteredObjects.map(obj => obj.Text.split('\n'));
    data = data.concat(text.join('\n')) 
    data = data.concat('\n') 
    console.log(text)

    return text
  } catch (error) {
    console.error("Error coverting pdf to text:", error);
    throw error;
  }
}

// Get the text from a saved file
app.post('/get-saved-text', (req, res) => {
  getFile(req.body.filename).then(textData => {
      res.send(textData); 
    }
  )
});

// Save a file to S3
app.get('/save-file', (req, res) => {
    sendFile()
    console.log("File Saved")
    res.send(filename)
})

// Get the file names from s3
app.get('/get-filenames', (req, res) => {
  listS3FileNames().then(textData => {
    res.json(textData); 
  })
});


// convert the pdf to text so it can be displayed
app.post('/convert-pdf-to-text',(req, res)=>{
  readPDF(req.body).then(textData =>{
    res.send(textData)
  })
});

// Save the files name to be used for saving the file text
app.post('/save-file-name',(req, res)=>{
  filename = req.body.filename
  // Saved file will be the text not the pdf
  filename = filename.replace(".pdf",".txt")
  res.send(200)
})