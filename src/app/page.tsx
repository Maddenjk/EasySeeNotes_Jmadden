'use client'
import { useEffect, useRef, useState } from "react";

// The text to speech didn't work on AWS
// import { useSpeech } from "react-text-to-speech";
export default function Home(this: any) {

  // Text to be displayed
  const [text, setText] = useState(<></>)
  // Saved files filenames
  const [fileNames, setFileNames] = useState<{ value: string; label: string; }[]>([]);
  // const { Text, speechStatus, start, pause, stop } = useSpeech({text: text, highlightText: true, highlightMode: "word"} )  
  // The file name that has been opened
  const inputFile = useRef<any>(null);

  // Text to indicate that file has been sabed
  const saveLabel = useRef<any>(null);

  // This function saves the file to S3
  async function saveFile(event:any){
    // Make sure we have a file and it has text
    if(inputFile.current && text != <></>){
      if(inputFile.current.value != ""){
            await fetch('52.70.8.255:5000/save-file',{
              method:"GET"
            }).then(async(response)=>{
                await response.text().then((filename)=>{
                  // Show that file was saved
                  saveLabel.current.hidden = false
                  // Add the files to the file name dropdown
                  const newOption =  { value: filename, label: filename }
                  let tempfiles = [...fileNames]
                  const hasValue = tempfiles.some(file => file.value == newOption.value)
                  if(!hasValue)
                  {
                    tempfiles.push(newOption)
                  }
                  setFileNames(tempfiles);
                })
            })
        }
      }
  }

  // Open a new file to get the text from
  async function selectNewFile(event:any){
    const name = event.target.files[0].name
    const buffer = await event.target.files[0].arrayBuffer()
    // Save the filename for if we want to save the file later
    await fetch('52.70.8.255:5000/save-file-name',{
      method:"POST",
      headers:{
        'Content-Type': "application/json"
      },
      body: JSON.stringify({"filename":name})
    })
    // Convert the pdf into text that can be displayed
    await fetch('52.70.8.255:5000/convert-pdf-to-text', {
      method:"POST",
      headers:{
        "content-type": "application/octet-stream"
      },
      body:buffer
      }).then(async(response)=>{
        await response.json().then((textData)=>{
          let textArray:any =[]
          let counter = 0
          // If there is no text clear the text
          if(textData.length == 0){
            setText(<></>)
          }
          else{
            textData.forEach((item: string[]) => {
              // For each line of text
              item.forEach(element => {
                // Add a paragraph
                let key = "TextLine" + counter
                textArray.push(<p className="easysee" key={key}>{element}</p>)
                counter += 1  
              });
            });
            // Show the text
            setText(textArray)
            // New text has been displayed so "file saved" text should be hidden
            saveLabel.current.hidden = true
          }
        })
      })
  }

  // Get the text from the saved file
  async function getSavedFileText(filename:string){
    // If there is a filename
    if(filename != ""){
      // Get the file from S3
      const response = await fetch('52.70.8.255:5000/get-saved-text',{
      method:"POST",
      headers:{
        "content-type": "application/json"
      },
      body:JSON.stringify({"filename":filename})
      })
      const data = await response.json();
      let textArray:any =[]
      let counter = 0
      // If no data set text to empty
      if(data.length == 0){
        setText(<></>)
      }
      else{
        // for each line of text
        data.forEach((item: string) => {
          // Add a paragraph
          let key = "TextLine" + counter
          textArray.push(<p className="easysee" key={key}>{item}</p>)
          counter += 1
        });
        // Set the text
        setText(textArray)
        // We are using a saved file so the input file name and save
        // label need to be cleared
        inputFile.current.value = ""
        saveLabel.current.hidden = true
      }
    }
  }

// This is the displayed text
function DocumentTextComponent(){
// if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
//   return(<Text/>)
// }
// else{
  return(<>{text}</>)
// }
}

// This is the component for the list of filenames
function FilenamesListComponent() {

  // Get the list of filenames
  async function getFileNames(){
    const fileList:{ value: string; label: string; }[] = [];
    fetch('52.70.8.255:5000/get-filenames')
    .then(response => response.json())
    .then(data => {
      console.log("Received text from server:", data);
      // Set it into a form that can be used later by the select
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

  // Get the filenames after component is created
  useEffect(()=> {
    getFileNames()
  },[]);
      return(<select id="fileList" className="easysee" onChange={handleChange}>
          <option className="easysee" key="" value="">
          </option>
          {
          fileNames.map((option) => (
          <option className="easysee" key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        </select>)
}

  return (
    <div>
      <main>
        <input className="easysee" type="file" name="selectFile" id="selectFile" ref={inputFile} onChange={selectNewFile} accept=".pdf"></input>
        <button className="easysee" id="savefile" name="savefile" title="Save Text" onClick={saveFile}>Save Text</button>
        <label className="easysee" hidden={true} id="saveLabel" ref={saveLabel} >Text File Saved</label>
        <br />
        <label className="easysee" id="saved files">Saved Files:</label>
        {FilenamesListComponent()}
        <br />
        {/* <label className="easysee" id="texttospeech">Text to Speech:</label>
        <button className="easysee" disabled={speechStatus === "started"} onClick={start}>Start</button>
        <button className="easysee" disabled={speechStatus === "paused"} onClick={pause}>Pause</button>
        <button className="easysee" disabled={speechStatus === "stopped"} onClick={stop}>Stop</button> */}
        {DocumentTextComponent()}
      </main>
    </div>
  );
}

