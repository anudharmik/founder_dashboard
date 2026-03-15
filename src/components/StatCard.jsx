export default function StatCard({title,value}){
    return (
        <div
          style={{
            border:"1px solid #ddd",
            borderRadius:"8px",
            padding:"20px",
            width:"180px",
            textAlign:"center",
            backGround:"#f9f9f9"
          }}
        >
            <h3>{title}</h3>
            <p style={{fontSize:"24px",fontWeight:"bold"}}>
                {value}
            </p>
        </div>
    );
}