(async()=>{
  try{
    const signupResp = await fetch('http://localhost:2026/api/auth/signup', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name:'Test QA', email:'testqa+2@example.com', password:'pass1234', phone:'9000000001'})
    });
    const signup = await signupResp.json();
    console.log('SIGNUP', signup);

    const signinResp = await fetch('http://localhost:2026/api/auth/signin', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email:'testqa+2@example.com', password:'pass1234'})
    });
    const signin = await signinResp.json();
    console.log('SIGNIN', signin);
  }catch(e){console.error(e)}
})();
