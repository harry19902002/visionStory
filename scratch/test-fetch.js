async function test() {
  const url = 'https://u316886-77936903aee0.westd.seetacloud.com:8443/api/workflow/generate';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      redirect: 'manual'
    });
    console.log('Status:', res.status, res.statusText);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    console.log('Body:', await res.text());
  } catch (e) {
    console.error('Fetch failed:', e);
  }
}
test();
