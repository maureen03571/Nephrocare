async function testAI() {
  try {
    const res = await fetch('https://text.pollinations.ai/prompt/What%20is%20kidney%20disease%3F');
    const text = await res.text();
    console.log("RESPONSE:", text);
  } catch (e) {
    console.error(e);
  }
}
testAI();
