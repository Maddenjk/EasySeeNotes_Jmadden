'use client'
import Image from "next/image";
import styles from "./main.css";
import { useEffect, useRef, useState } from "react";

export default function Home(this: any) {

  const [text, setText] = useState(<></>)
  const [fileNames, setFileNames] = useState<{ value: string; label: string; }[]>([]);
  
  const inputFile = useRef<any>(null);
  const saveLabel = useRef<any>(null);

  async function saveFile(event:any){
    if(inputFile.current && text != <></>){
      if(inputFile.current.value != ""){
            await fetch('http://localhost:5000/save-file',{
              method:"GET"
            }).then((result)=>{
              const filename = result.toString()
              saveLabel.current.hidden = false
              const newOption =  { value: filename, label: filename }
              const tempfiles = fileNames
              tempfiles.push(newOption)
              setFileNames(tempfiles);
            })
        }
      }
  }

  async function selectNewFile(event:any){
    const name = event.target.files[0].name
    console.log(name)
    const buffer = await event.target.files[0].arrayBuffer()
    console.log(buffer)
      await fetch('http://localhost:5000/save-file-name',{
        method:"POST",
        headers:{
          'Content-Type': "application/json"
        },
        body: JSON.stringify({"filename":name})
      })
      await fetch('http://localhost:5000/convert-pdf-to-text', {
        method:"POST",
        headers:{
          "content-type": "application/octet-stream"
        },
        body:buffer
        }).then(async(response)=>{
          await response.json().then((textData)=>{
            console.log(textData)
            let textArray:any =[]
            let counter = 0
            if(textData.length == 0){
              setText(<></>)
            }
            else{
              textData.forEach((item: string[]) => {
                item.forEach(element => {
                  let key = "TextLine" + counter
                  textArray.push(<p key={key}>{element}</p>)
                  counter += 1  
                });
              });
              setText(textArray)
              saveLabel.current.hidden = true
          }
        })
      })
  }


  async function getSavedFileText(filename:string){
    if(filename != ""){
      const response = await fetch('http://localhost:5000/get-saved-text',{
      method:"POST",
      headers:{
        "content-type": "application/json"
      },
      body:JSON.stringify({"filename":filename})
      })
      const data = await response.json();
      let textArray:any =[]
      let counter = 0
      if(data.length == 0){
        setText(<></>)
      }
      else{
        data.forEach((item: string) => {
          let key = "TextLine" + counter
          textArray.push(<p key={key}>{item}</p>)
          counter += 1
        });
        setText(textArray)
        inputFile.current.value = ""
        saveLabel.current.hidden = true
      }
    }
  }

function DocumentTextComponent(){
  return(<>{text}</>)
}

function FilenamesListComponent() {

  async function getFileNames(){
    const fileList:{ value: string; label: string; }[] = [];

    fetch('http://localhost:5000/get-filenames',)
    .then(response => response.json()) // Parse the response as plain text
    .then(data => {
      console.log("Received text from server:", data);
      // Display the text on your webpage
      data.forEach((element: string) => {
        const newOption =  { value: element, label: element }
        fileList.push(newOption);
      });
      setFileNames(fileList)
    })
    .catch(error => {
      console.error("Error fetching data from server:", error);
    })
  }
  const handleChange = (event:any)=>{
    getSavedFileText(event.target.value)
  }
  useEffect(()=> {
    getFileNames()

  },[]);
      return(<select id="fileList" onChange={handleChange}>
          <option key="" value="">
          </option>
          {
          fileNames.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        </select>)
}

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <input type="file" name="selectFile" id="selectFile" ref={inputFile} onChange={selectNewFile} accept=".pdf"></input>
        <button id="savefile" name="savefile" title="Save Text" onClick={saveFile}>Save Text</button>
        <label hidden={true} id="saveLabel" ref={saveLabel} >Text File Saved</label>
        <br />
        {FilenamesListComponent()}
        <br />
        {DocumentTextComponent()}
      </main>
    </div>
  );
}

