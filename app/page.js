'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';


export default function Home() {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleChange = (event) => {
    setCode(event.target.value);
  };

  const handleSubmit = async (event) =>{
    event.preventDefault()
    const res = await fetch(`/api/boards/${code}`, { method: 'GET' });
    if(res.ok){
      router.push(`/b/${code}`)
    } else{
      alert("Board not found")
    }
  }

  return (
    <main>
      <h1>Rental Kanban</h1>
      <p>Enter a board code to get started. (Not yet implemented.)</p>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={code} 
          onChange={handleChange} 
          placeholder="ABCDEF"
        />
        <button type="submit">Submit</button>
      </form>
    </main>
  );
}
