const signInBtn = document.getElementById("showSignIn"); 
const signUpBtn = document.getElementById("showSignUp"); 
const signInOverlay = document.getElementById("signinOverlay"); const signUpOverlay = document.getElementById("signupOverlay"); 

function openModal(overlay) { closeModals();
  overlay.classList.add("active");
} 
function closeModals() { 
  if (signInOverlay) signInOverlay.classList.remove("active"); 
  if (signUpOverlay) signUpOverlay.classList.remove("active"); 
}
if (signInBtn && signInOverlay) {
  signInBtn.onclick = () => openModal(signInOverlay); 
}

if (signUpBtn && signUpOverlay) {
  signUpBtn.onclick = () => openModal(signUpOverlay);  
}
window.onclick = (event) => { 
  if (event.target === signInOverlay || event.target === signUpOverlay) {
    closeModals(); } 
  };

const signUpForm = document.getElementById('signUpForm');
if(signUpForm){
signUpForm.addEventListener('submit', async(event)=>{
  event.preventDefault();

  const data = {
    signUp_email: document.getElementById('signup-email').value,
    signUp_username: document.getElementById('signup-username').value,
    signUp_password: document.getElementById('signup-password').value,
    signUp_major: document.getElementById('signup-major').value
  };

   if(!data.signUp_email || !data.signUp_username || !data.signUp_password){
    alert('Please enter all the required information correctly.');
    return;
  }

  try{
    const response = await fetch('/sign-up', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    if(result.success){
      alert(`${result.message}`);
      console.log(`${result.message}`);
      signUpForm.reset();
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);

      window.location.href = '/user.html';
    }else{
      alert(`Error occurred: ${result.errormessage}`);
      console.log(`Error occurred: ${result.errormessage}`);
    }
  }catch(error){
    console.log('Could not connect to the server.');
  }
});
}

const signInForm = document.getElementById('signInForm');
if(signInForm){
signInForm.addEventListener('submit', async(event)=>{
  event.preventDefault();

  const data = {
    signIn_email: document.getElementById('signin-email').value,
    signIn_password: document.getElementById('signin-password').value
  };
  if(!data.signIn_email || !data.signIn_password){
    alert('Please enter all the required information correctly.');
    return;
  }

  try{
    const response = await fetch('/sign-in', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if(!result.success){
      alert(result.message);
      console.log('the user does not sign up first.');
    }else if(!result.correct){
      alert(result.message);
      console.log('Incorrect password!');
    }
    else{
      localStorage.setItem(
        'accessToken', result.accessToken);
      localStorage.setItem(
      'refreshToken', result.refreshToken);

      alert(result.message);
      console.log('logged in successfully.');
      console.log('about to reset');
      signInForm.reset();
      console.log('after the reset');
      window.location.href = '/user.html';
    }
  }catch(error){
    console.error('Error:', error.message);
  }
});
}


/* --- Dynamic Input Switching --- */
function changeSearchInput() {
  const type = document.getElementById("searchType").value;
  const input = document.getElementById("searchValue");
  
  if(type === "reminder_time") {
    input.type = "datetime-local";
  } else {
    input.type = "text";
    input.placeholder = `Search by target ${type.replace('_', ' ')}...`;
  }
}

/* --- Session Logout Handler --- */
function logoutSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  alert("Session cleared. Logging out...");
  window.location.href = "/index.html";
}

async function authenticatedFetch(url, options) {
  let response = await fetch(url, options);
  console.log('First request:', response.status);

  if(response.status === 403)
    {
      const refreshResponse = await fetch('/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({refreshToken: localStorage.getItem('refreshToken')})
      });
      console.log('Refresh response:', refreshResponse.status);
      const refreshResult = await refreshResponse.json();
      localStorage.setItem('accessToken', refreshResult.accessToken);
      
      const newToken = refreshResult.accessToken;
      localStorage.setItem('accessToken', newToken);
      options.headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(url, options);
}
  return response;
}

const addTaskForm = document.getElementById('addTaskForm');
if(addTaskForm){
addTaskForm.addEventListener('submit', async(event)=>{
  event.preventDefault();

  const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('You are not logged in! Please sign in first.');
      window.location.href = '/index.html';
      return;
    }

  const data = {
    task_name: document.getElementById('task_name').value,
    category: document.getElementById('category').value,
    task_type: document.getElementById('task_type').value,
    description: document.getElementById('description').value,
    reminder_time: document.getElementById('reminder_time').value
  };
  if(!data.task_name){
    alert('Task name is required.');
    return;
  }

  try{
    const response = await authenticatedFetch('/add-task', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}`},
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if(result.success){
      alert(result.message);
      console.log('task inserted successfully.');
      addTaskForm.reset();

    }else if(!result.check){
      alert(result.message);
      console.log( 'Token is required.');
    }else if(!result.correct){
      alert(result.message);
      console.log('Invalid token!');
    }else{
      alert(`Error occurred: ${result.error}`);
      console.log(`Error occurred: ${result.error}`);
    }

  }catch(error){
    console.log('Error:', error.message);
  }
});
}

const searchTask = document.getElementById('search-group');
if(searchTask){
searchTask.addEventListener('submit', async(event)=>{
  event.preventDefault();
  const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('You are not logged in! Please sign in first.');
      window.location.href = '/index.html';
      return;
    }
  const searchType = document.getElementById('searchType').value;
  const searchValue = document.getElementById('searchValue').value;
  const taskListBox = document.getElementById('taskList');
    if(!searchValue){
      alert('search value is required.');
      return;
    }
  try{
    const response = await authenticatedFetch(`/search-task/${searchType}/${encodeURIComponent(searchValue)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    const result = await response.json();
    if(result.success){
      console.log('tasks are found.');

      taskListBox.innerHTML =  `
          <table class="task-table">

            <thead>
              <tr>
                <th>Task Name</th>
                <th>Category</th>
                <th>Task Type</th>
                <th>Description</th>
                <th>Reminder Time</th>
              </tr>
            </thead>

            <tbody>
              ${result.data.map(task => `
                <tr>
                  <td>${task.Task_name}</td>
                  <td>${task.Category}</td>
                  <td>${task.Task_type}</td>
                  <td>${task.Description}</td>
                  <td>${task.Reminder_time}</td>
                </tr>
              `).join('')}
            </tbody>

          </table>
        `;
    }else{
      console.log(result.message);
      alert(result.message);
    }
  }catch(error){
    console.log('Error:', error.message);
  }
});}

const resetBtn = document.getElementById('viewAll');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    console.log('Resetting the form and clearing search results.');
    document.getElementById('search-group').reset();
    document.getElementById('taskList').innerHTML = '';
  });
}