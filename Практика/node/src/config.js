import path from "path";
export function loadConfig() {
  const port = parseInt(process.env.PORT || "3000", 10);
  const soapWsdlUrl = process.env.SOAP_WSDL_URL || "http://127.0.0.1:8001/wsdl/library.wsdl";
  const soapEndpointUrl = process.env.SOAP_ENDPOINT_URL || "http://127.0.0.1:8001/soap-server.php";
  const legacyReportXmlUrl =
    process.env.LEGACY_REPORT_XML_URL ||
    "http://127.0.0.1:8001/report.php?type=overdue&raw=1";

  const tinydbDir = process.env.TINYDB_DIR || "./data/tinydb";
  const soapTestInventory = process.env.SOAP_TEST_INVENTORY || "LIB-2024-001";
  return {
    port,
    soapWsdlUrl,
    soapEndpointUrl,
    legacyReportXmlUrl,
    tinydbDir: path.resolve(process.cwd(), tinydbDir),
    soapTestInventory
  };
}