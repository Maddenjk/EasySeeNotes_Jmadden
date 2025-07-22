const { TextractClient, DetectDocumentTextCommand } = require("@aws-sdk/client-textract");
const express = require("express");
const cors = require('cors');
const {PDFDocument} = require('pdf-lib'); 

const app = express();
const port = 5000;
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
app.listen(port, () => {
    console.log(`server running on port ${port}`);
    console.log(`access at http://localhost:${port}`)
});

const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3Client = new S3Client();

const bucketName = "easyseenotes";

let data = ""

let filename = ""

const sendFile =async () =>{
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: data,
    }),
  );
}

const getFile = async (objectKey) =>{
    const data = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: objectKey }));
    result = await data.Body.transformToString();
    result = result.split("\n")
    console.log(result)
    return result;
}

async function listS3FileNames() {
  try {
    const command = new ListObjectsV2Command({ Bucket: bucketName });
    const response = await s3Client.send(command);

    if (response.Contents) {
      const fileNames = response.Contents.map(file => file.Key);
      console.log(fileNames)
      return fileNames;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error listing filenames:", error);
    throw error;
  }
}

const readPDF = async (file) =>{
  result = []
  try{
    const pdf = await PDFDocument.load(file);
    const numberOfPages = pdf.getPages().length;
    data = "";
    for (let i = 0; i < numberOfPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();
      result.push(await readPage(pdfBytes));
      result.push([[]]);
    }
  }
  catch (error) {
    console.error('error:', error);
  }
  return result
}


const readPage = async (fileImage) =>{
  try {
    const client = new TextractClient();
    const input = { // DetectDocumentTextRequest
      Document: { // Document
        Bytes: fileImage
      },
    };
    const command = new DetectDocumentTextCommand(input);
    const response = await client.send(command);
    const filteredObjects = response.Blocks.filter(obj => {
      const values = Object.values(obj);   
      return values.some(value => {
        if (Array.isArray(value)) {
          return value.includes("LINE");
        }
        return typeof value === 'string' && value.includes("LINE");
  }); 
    });
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

app.post('/get-saved-text', (req, res) => {
  getFile(req.body.filename).then(textData => {
      // Send the resolved text as a plain text response
      res.send(textData); 
    }
  )
});

app.get('/save-file', (req, res) => {
    sendFile()
    res.send(filename)
})

app.get('/get-filenames', (req, res) => {
  listS3FileNames().then(textData => {
    // Send the resolved text as a plain text response
    res.json(textData); 
  })});

   
app.post('/convert-pdf-to-text',(req, res)=>{
  readPDF(req.body).then(textData =>{
    res.send(textData)
  })
});

app.post('/save-file-name',(req, res)=>{
  console.log(req.body.filename)
  filename = req.body.filename
  filename = filename.replace(".pdf",".txt")
  res.send(200)
})