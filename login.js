firebase.auth().onAuthStateChanged(() => {

});
  
function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
  
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(() => {
        location.href = "app.html";
      })
      .catch(err => alert(err.message));
}
  
function signup() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
  
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(() => {
        location.href = "app.html";
      })
      .catch(err => alert(err.message));
}