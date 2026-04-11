export default function StatCard({title,value,darkMode}){
    return (
        <div
          style={{
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center",
            background: darkMode?"#1e293b":"#ffffff",
            color: darkMode?"#e2e8f0":"#111827",
            boxShadow: darkMode?"0 2px 8px rgba(0,0,0,0.3)":"0 2px 8px rgba(0,0,0,0.08)",
            minHeight:"140px"
          }}
        >
            <h3 style={{fontSize:"14px",color:darkMode?"#94a3b8":"#6b7280"}}>{title}</h3>
            <p style={{fontSize:"28px",fontWeight:"bold",marginTop:"10px"}}>
                {value}
            </p>
        </div>
    );
}