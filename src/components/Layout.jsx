import Sidebar from "./Sidebar"

export default function Layout({children}){
    return (
      <div style={{ display:"flex"}}>
        <Sidebar/>

        <div style={{padding :"30px",flex:1}}>
          {children}
        </div>
      </div>      
    );
}