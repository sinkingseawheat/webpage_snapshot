
const FormFieldSource:React.FC<{formData:{[k:string]:string}}> = ({formData})=>{
  return (
    <table>
      <thead>
        <tr>
          <th>プロパティ</th>
          <th>値</th>
        </tr>
      </thead>
      <tbody>
      {Array.from(Object.entries(formData)).map(([key, value])=>{
        return (<tr key={key}>
          <td>{key}</td><td>{value}</td>
        </tr>);
      })}
      </tbody>
    </table>
    );
}

export { FormFieldSource }