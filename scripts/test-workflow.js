const URL = 'https://uu316886-77936903aee0.westd.seetacloud.com:8443';

async function testWorkflow() {
  console.log('Sending workflow generation request...');
  
  const inputImage = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500"; 
  
  const response = await fetch(`${URL}/api/workflow/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow_id: 'H17-文图生视频-LTX2.3全面优化版',
      input_values: {
        "2004:image": inputImage,
        "5013:text": "the man saying \"Our marriage is void. Pack your things and leave.\"",
        "5018:value": 720,
        "5020:value": 1280
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  console.log('Generation request accepted:', data);

  const promptId = data.prompt_id;
  if (!promptId) {
    throw new Error('No prompt_id returned from API');
  }

  console.log(`Starting polling for prompt_id: ${promptId}`);
  
  const interval = 5000;
  let finished = false;
  
  while (!finished) {
    await new Promise(resolve => setTimeout(resolve, interval));
    
    try {
      console.log(`Checking status at ${new Date().toLocaleTimeString()}...`);
      const statusResponse = await fetch(`${URL}/api/workflow/result?prompt_id=${promptId}`);
      if (!statusResponse.ok) {
        console.error(`Error polling status: ${statusResponse.status}`);
        continue;
      }
      
      const statusData = await statusResponse.json();
      console.log('Status result:', JSON.stringify(statusData, null, 2));
      
      if (statusData.pending === false) {
        console.log('Workflow process finished!');
        finished = true;

        if (statusData.success === false || statusData.error) {
          console.error(`Workflow run failed: ${statusData.error || 'Unknown error'}`);
        } else if (statusData.results && statusData.results.length > 0) {
          console.log('\n================ Generated Results ================');
          statusData.results.forEach((r, idx) => {
            const absoluteUrl = URL + r.url;
            console.log(`[Result #${idx + 1}] Type: ${r.type}`);
            console.log(`  File Name: ${r.filename}`);
            console.log(`  Absolute URL: ${absoluteUrl}`);
          });
          console.log('===================================================\n');
        } else {
          console.log('Workflow finished but no results were found in the response.');
        }
      }
    } catch (err) {
      console.error('Error during polling:', err.message);
    }
  }
}

testWorkflow().catch(console.error);
