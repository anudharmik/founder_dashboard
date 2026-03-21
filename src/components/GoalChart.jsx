import { PieChart,Pie,Cell,Tooltip,Legend } from "recharts";

export default function GoalChart({tasks}){
    const completed=tasks.filter(t=> t.completed).length;
    const total=tasks.length;
    const remaining =total-completed;

    const data=[
        {name:"Completed",value:completed},
        {name:"Remaining",value:remaining}
    ];

    const COLORS=["#22c55e","#ef4444"];

    return (
        <PieChart width={400} height={300}>
            <Pie
            data ={data}
            dataKey="value"
            cx="50%"
            cy="50y"
            outerRadius={100}
            label>
                {data.map((entry,index)=>(
                    <Cell key={index} fill={COLORS[index]}/>
                ))}
            </Pie>
        </PieChart>
    )
}