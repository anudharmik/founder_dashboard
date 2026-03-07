import {Link} from 'react-router-dom';

export default function Sidebar(){
    return(
        <div
          style={{
            width:"200px",
            height :"100vh",
            background :"#111",
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
        </div>
    )
}