import {Link} from 'react-router-dom';
import {supabase} from '../supabaseClient';
export default function Sidebar({darkMode}){

    async function logout(){
        await supabase.auth.signOut();
    }

    const buttonStyle = {
      padding: "10px 16px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      background: "#ef4444",
      color: "white",
      fontWeight: "600",
      marginTop: "auto",
      width: "100%",
      transition: "all 0.2s ease"
    };

    const linkStyle = {
      padding: "12px 16px",
      borderRadius: "8px",
      marginBottom: "8px",
      cursor: "pointer",
      textDecoration: "none",
      color: darkMode ? "#e2e8f0" : "#d1d5db",
      fontWeight: "500",
      transition: "all 0.2s ease",
      display: "block"
    };

    return(
        <div
          style={{
            width:"260px",
            height :"100vh",
            position: "sticky",
            top: 0,
            background :darkMode? "#0f172a":"#111827",
            color :"white",
            padding:"24px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "4px 0 15px rgba(0,0,0,0.1)",
            borderRight: darkMode ? "1px solid #1e293b" : "none"
          }}
        >
            <h2 style={{
                fontSize: "24px", 
                fontWeight: "800", 
                marginBottom: "30px",
                background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
            }}>Founder OS</h2>
            
            <nav style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              <Link to="/" style={linkStyle} onMouseEnter={(e)=>e.target.style.background=darkMode?"#1e293b":"#374151"} onMouseLeave={(e)=>e.target.style.background="transparent"}>Dashboard</Link>
              <Link to="/goals" style={linkStyle} onMouseEnter={(e)=>e.target.style.background=darkMode?"#1e293b":"#374151"} onMouseLeave={(e)=>e.target.style.background="transparent"}>Goals</Link> 
              <Link to="/tasks" style={linkStyle} onMouseEnter={(e)=>e.target.style.background=darkMode?"#1e293b":"#374151"} onMouseLeave={(e)=>e.target.style.background="transparent"}>Tasks</Link>
              <Link to="/projects" style={linkStyle} onMouseEnter={(e)=>e.target.style.background=darkMode?"#1e293b":"#374151"} onMouseLeave={(e)=>e.target.style.background="transparent"}>Projects</Link>
              <Link to="/analytics" style={linkStyle} onMouseEnter={(e)=>e.target.style.background=darkMode?"#1e293b":"#374151"} onMouseLeave={(e)=>e.target.style.background="transparent"}>Analytics</Link>
            </nav>
            <button style={buttonStyle} onClick={logout} onMouseEnter={(e)=>e.target.style.background="#dc2626"} onMouseLeave={(e)=>e.target.style.background="#ef4444"}>Logout</button>
        </div>
    )
}