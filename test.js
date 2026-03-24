const { JSDOM } = require("jsdom");
const dom = new JSDOM(`
  <select id="mySelect">
    <option value="">Choose</option>
    <optgroup label="Group1">
      <option value="1">1</option>
    </optgroup>
  </select>
`);
console.log(dom.window.document.getElementById("mySelect").options.length);
