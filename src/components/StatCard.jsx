export default function StatCard({title,value}){
    return (
        <div
          style={{
            border:"2px solid #0f0d47",
            borderRadius:"8px",
            padding:"20px",
            width:"160px",
            textAlign:"center",
            backGround:"#f9f9f9"
          }}
        >
            <h3 style={{fontSize:"20px"}}>{title}</h3>
            <p style={{fontSize:"24px",fontWeight:"bold"}}>
                {value}
            </p>
        </div>
    );
}