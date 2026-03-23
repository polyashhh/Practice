import soap from "soap";
export async function createSoapClient(wsdlUrl, endpointUrl) {
  const client = await soap.createClientAsync(wsdlUrl); 
  client.setEndpoint(endpointUrl);
  return client;
}
function unwrapSoapReturn(result) {
  if (!result) return null;
  if (result.return !== undefined) return result.return;
  return result;
}
export async function soapGetBookByInventory(client, inventory_number) {
  const [res] = await client.getBookByInventoryAsync({ inventory_number });
  return unwrapSoapReturn(res); 
}
export async function soapSearchBooksByAuthor(client, author_name) {
  const [res] = await client.searchBooksByAuthorAsync({ author_name });
  return unwrapSoapReturn(res); 
}
export async function soapRegisterLoan(client, inventory_number, reader_card) {
  const [res] = await client.registerLoanAsync({ inventory_number, reader_card });
  return unwrapSoapReturn(res); 
}
export async function soapReturnBook(client, inventory_number) {
  const [res] = await client.returnBookAsync({ inventory_number });
  return unwrapSoapReturn(res); 
}