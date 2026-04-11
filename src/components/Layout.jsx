import Sidebar from "./Sidebar"

export default function Layout({children, darkMode}){
    return (
      <div style={{ display:"flex",minHeight:"100vh",background:"transparent"}}>
        <Sidebar darkMode={darkMode}/>

        <div style={{padding :"30px",flex:1}}>
          {children}
        </div>
      </div>      
    );
}