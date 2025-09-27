// app.js

const auth = firebase.auth();

function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      alert("Signup successful!");
    })
    .catch((error) => {
      alert(error.message);
    });
}

function signIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      alert("Login successful!");
      // yahan baad me dashboard open karenge
    })
    .catch((error) => {
      alert(error.message);
    });
}

function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      alert("Google login successful!");
    })
    .catch((error) => {
      alert(error.message);
    });
}
