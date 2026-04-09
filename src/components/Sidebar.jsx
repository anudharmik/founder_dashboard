import {Link} from 'react-router-dom';
import {supabase} from '../supabaseClient';
export default function Sidebar(){

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
            width:"200px",
            height :"100vh",
            background :"#0f0d47",
            color :"white",
            padding:"20px"
          }}
        >
            <h2>Founder OS</h2>
            <nav style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                <Link to="/" style={{color:"white"}}>Dashboard</Link>
                <Link to="/goals" style={{color:"white"}}>Goals</Link>
                <Link to="/tasks" style={{color:"white"}}>Tasks</Link>
                <Link to="/projects" style={{color:"white"}}>Projects</Link>
                <Link to="/analytics" style={{color:"white"}}>Analytics</Link>
            </nav>
            <button style={buttonStyle}onClick={logout} >Logout</button>
        </div>
    )
}