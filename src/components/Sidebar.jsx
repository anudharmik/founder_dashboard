import {Link} from 'react-router-dom';
import {supabase} from '../supabaseClient';
export default function Sidebar({darkMode}){

    async function logout(){
        await supabase.auth.signOut();
    }

    const buttonStyle = {
      padding: "6px 12px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      background: "#3b82f6",
      color: "white",
      marginLeft: "8px"
    };
    return(

        <div
          style={{
            width:"240px",
            height :"100vh",
            background :darkMode? "#020617":"#111827",
            color :"white",
            padding:"20px"
          }}
        >
            <h2>Founder OS</h2>
            <nav style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"10px",marginTop:"10px"}}>
              <Link to="/" style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "8px",
              cursor: "pointer"
              }}>Dashboard</Link>
              <Link to="/goals" style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "8px",
              cursor: "pointer"
            }}>Goals</Link> 
              <Link to="/tasks" style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "8px",
              cursor: "pointer"
            }}>Tasks</Link>
              <Link to="/projects" style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "8px",
              cursor: "pointer"
            }}>Projects</Link>
              <Link to="/analytics" style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "8px",
              cursor: "pointer"
            }}>Analytics</Link>
            </nav>
            <button style={buttonStyle}onClick={logout} >Logout</button>
        </div>
    )
}