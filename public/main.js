fetch('/get-filenames')
  .then(response => response.json()) // Parse the response as plain text
  .then(data => {
    console.log("Received text from server:", data);
    // Display the text on your webpage
    const fileList = document.getElementById('fileList');
    data.forEach(element => {
        const newOption = document.createElement('option');
        newOption.value = element;
        newOption.textContent = element;
        fileList.appendChild(newOption);
    });
    
  })
  .catch(error => {
    console.error("Error fetching data from server:", error);
  });
fetch('/get-text')
  .then(response => response.text()) // Parse the response as plain text
  .then(data => {
    console.log("Received text from server:", data);
    // Display the text on your webpage
    document.getElementById('documentText').innerText = data; 
  })
  .catch(error => {
    console.error("Error fetching data from server:", error);
  });

('/test').then