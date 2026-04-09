export default function StatCard({title,value}){
    return (
        <div
          style={{
            borderRadius: "12px",
            padding: "20px",
            width: "180px",
            textAlign: "center",
            background: "#ffffff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
          }}
        >
            <h3 style={{fontSize:"14px",color:"#6b7280"}}>{title}</h3>
            <p style={{fontSize:"28px",fontWeight:"bold",marginTop:"10px"}}>
                {value}
            </p>
        </div>
    );
}