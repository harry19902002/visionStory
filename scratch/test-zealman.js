const URL = 'https://u316886-77936903aee0.westd.seetacloud.com:8443';

async function testWorkflow() {
  console.log('Sending workflow generation request...');
  
  // Replace this with the actual cpolar URL you see in your logs or minio
  const inputImage = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500"; 
  
  const requestBody = {
    workflow_id: 'H17-文图生视频-LTX2.3全面优化版',
    input_values: {
      "2004:image": inputImage,
      "5013:text": "the man saying \"Our marriage is void. Pack your things and leave.\"",
      "5018:value": 720,
      "5020:value": 1280
    }
  };

  console.log("Request Body:", JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(`${URL}/api/workflow/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`\nHTTP status: ${response.status} ${response.statusText}`);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    const text = await response.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testWorkflow();
