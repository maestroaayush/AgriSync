Current state values:
TransporterDashboard.jsx:1709 transportMetrics: {deliveryStats: Array(1), totalDeliveries: 3, completedDeliveries: 0, completionRate: '0.0', avgDeliveryTime: 24, …}
TransporterDashboard.jsx:1710 fuelData: {avgFuelEconomy: '12.7', monthlyFuelCost: 21040, co2Emissions: 363, totalDistance: 12148}
TransporterDashboard.jsx:1711 trends: [{…}]
TransporterDashboard.jsx:1712 activeTab: deliveries
TransporterDashboard.jsx:1431  PUT http://localhost:5000/api/deliveries/68a75ad6727454c99991e7ae/status 500 (Internal Server Error)
dispatchXhrRequest @ axios.js?v=0ec017e3:1648
xhr @ axios.js?v=0ec017e3:1528
dispatchRequest @ axios.js?v=0ec017e3:2003
_request @ axios.js?v=0ec017e3:2224
request @ axios.js?v=0ec017e3:2115
httpMethod @ axios.js?v=0ec017e3:2253
wrap @ axios.js?v=0ec017e3:8
updateStatus @ TransporterDashboard.jsx:1431
onClick @ TransporterDashboard.jsx:2424
executeDispatch @ react-dom_client.js?v=0ec017e3:11736
runWithFiberInDEV @ react-dom_client.js?v=0ec017e3:1485
processDispatchQueue @ react-dom_client.js?v=0ec017e3:11772
(anonymous) @ react-dom_client.js?v=0ec017e3:12182
batchedUpdates$1 @ react-dom_client.js?v=0ec017e3:2628
dispatchEventForPluginEventSystem @ react-dom_client.js?v=0ec017e3:11877
dispatchEvent @ react-dom_client.js?v=0ec017e3:14792
dispatchDiscreteEvent @ react-dom_client.js?v=0ec017e3:14773
<button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=0ec017e3:250
(anonymous) @ TransporterDashboard.jsx:2415
TransporterDashboard @ TransporterDashboard.jsx:2360
react-stack-bottom-frame @ react-dom_client.js?v=0ec017e3:17424
renderWithHooks @ react-dom_client.js?v=0ec017e3:4206
updateFunctionComponent @ react-dom_client.js?v=0ec017e3:6619
beginWork @ react-dom_client.js?v=0ec017e3:7654
runWithFiberInDEV @ react-dom_client.js?v=0ec017e3:1485
performUnitOfWork @ react-dom_client.js?v=0ec017e3:10868
workLoopSync @ react-dom_client.js?v=0ec017e3:10728
renderRootSync @ react-dom_client.js?v=0ec017e3:10711
performWorkOnRoot @ react-dom_client.js?v=0ec017e3:10330
performSyncWorkOnRoot @ react-dom_client.js?v=0ec017e3:11635
flushSyncWorkAcrossRoots_impl @ react-dom_client.js?v=0ec017e3:11536
flushSyncWork$1 @ react-dom_client.js?v=0ec017e3:10567
batchedUpdates$1 @ react-dom_client.js?v=0ec017e3:2632
dispatchEventForPluginEventSystem @ react-dom_client.js?v=0ec017e3:11877
dispatchEvent @ react-dom_client.js?v=0ec017e3:14792
dispatchDiscreteEvent @ react-dom_client.js?v=0ec017e3:14773
handleMouseUp_ @ unknown
<TransporterDashboard>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=0ec017e3:250
App @ App.jsx:55
react-stack-bottom-frame @ react-dom_client.js?v=0ec017e3:17424
renderWithHooks @ react-dom_client.js?v=0ec017e3:4206
updateFunctionComponent @ react-dom_client.js?v=0ec017e3:6619
beginWork @ react-dom_client.js?v=0ec017e3:7654
runWithFiberInDEV @ react-dom_client.js?v=0ec017e3:1485
performUnitOfWork @ react-dom_client.js?v=0ec017e3:10868
workLoopSync @ react-dom_client.js?v=0ec017e3:10728
renderRootSync @ react-dom_client.js?v=0ec017e3:10711
performWorkOnRoot @ react-dom_client.js?v=0ec017e3:10330
performWorkOnRootViaSchedulerTask @ react-dom_client.js?v=0ec017e3:11623
performWorkUntilDeadline @ react-dom_client.js?v=0ec017e3:36
<App>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=0ec017e3:250
(anonymous) @ main.jsx:10Understand this error
TransporterDashboard.jsx:1444 Failed to update delivery status AxiosError {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
updateStatus @ TransporterDashboard.jsx:1444
await in updateStatus
onClick @ TransporterDashboard.jsx:2424
executeDispatch @ react-dom_client.js?v=0ec017e3:11736
runWithFiberInDEV @ react-dom_client.js?v=0ec017e3:1485
processDispatchQueue @ react-dom_client.js?v=0ec017e3:11772
(anonymous) @ react-dom_client.js?v=0ec017e3:12182
batchedUpdates$1 @ react-dom_client.js?v=0ec017e3:2628
dispatchEventForPluginEventSystem @ react-dom_client.js?v=0ec017e3:11877
dispatchEvent @ react-dom_client.js?v=0ec017e3:14792
dispatchDiscreteEvent @ react-dom_client.js?v=0ec017e3:14773
<button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=0ec017e3:250
(anonymous) @ TransporterDashboard.jsx:2415
TransporterDashboard @ TransporterDashboard.jsx:2360
react-stack-bottom-frame @ react-dom_client.js?v=0ec017e3:17424
renderWithHooks @ react-dom_client.js?v=0ec017e3:4206
updateFunctionComponent @ react-dom_client.js?v=0ec017e3:6619
beginWork @ react-dom_client.js?v=0ec017e3:7654
runWithFiberInDEV @ react-dom_client.js?v=0ec017e3:1485
performUnitOfWork @ react-dom_client.js?v=0ec017e3:10868
workLoopSync @ react-dom_client.js?v=0ec017e3:10728
renderRootSync @ react-dom_client.js?v=0ec017e3:10711
performWorkOnRoot @ react-dom_client.js?v=0ec017e3:10330
performSyncWorkOnRoot @ react-dom_client.js?v=0ec017e3:11635
flushSyncWorkAcrossRoots_impl @ react-dom_client.js?v=0ec017e3:11536
flushSyncWork$1 @ react-dom_client.js?v=0ec017e3:10567
batchedUpdates$1 @ react-dom_client.js?v=0ec017e3:2632
dispatchEventForPluginEventSystem @ react-dom_client.js?v=0ec017e3:11877
dispatchEvent @ react-dom_client.js?v=0ec017e3:14792
dispatchDiscreteEvent @ react-dom_client.js?v=0ec017e3:14773
handleMouseUp_ @ unknown
<TransporterDashboard>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=0ec017e3:250
App @ App.jsx:55
react-stack-bottom-frame @ react-dom_client.js?v=0ec017e3:17424
renderWithHooks @ react-dom_client.js?v=0ec017e3:4206
updateFunctionComponent @ react-dom_client.js?v=0ec017e3:6619
beginWork @ react-dom_client.js?v=0ec017e3:7654
runWithFiberInDEV @ react-dom_client.js?v=0ec017e3:1485
performUnitOfWork @ react-dom_client.js?v=0ec017e3:10868
workLoopSync @ react-dom_client.js?v=0ec017e3:10728
renderRootSync @ react-dom_client.js?v=0ec017e3:10711
performWorkOnRoot @ react-dom_client.js?v=0ec017e3:10330
performWorkOnRootViaSchedulerTask @ react-dom_client.js?v=0ec017e3:11623
performWorkUntilDeadline @ react-dom_client.js?v=0ec017e3:36
<App>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=0ec017e3:250
(anonymous) @ main.jsx:10Understand this error
TransporterDashboard.jsx:2429 🔄 Vendor delivery completed: status updated + location sharing stopped
TransporterDashboard.jsx:623 TransporterDashboard rendered with user: {id: '68a4357c94513e28bd579bde', name: 'Test Transporter', email: 'transporter@test.com', role: 'transporter', location: 'Transport Hub', …}
TransporterDashboard.jsx:1653 === DELIVERIES DATA ANALYSIS ===
TransporterDashboard.jsx:1654 Raw deliveries array: (3) [{…}, {…}, {…}]
TransporterDashboard.jsx:1655 Deliveries count: 3
TransporterDashboard.jsx:1663 Delivered deliveries: []
TransporterDashboard.jsx:1664 In-transit deliveries: (3) [{…}, {…}, {…}]
TransporterDashboard.jsx:1665 Assigned deliveries: []
TransporterDashboard.jsx:1666 Pending deliveries: []
TransporterDashboard.jsx:1675 Stats calculations:
TransporterDashboard.jsx:1676 - Total deliveries: 3
TransporterDashboard.jsx:1677 - Completed (delivered): 0
TransporterDashboard.jsx:1678 - In transit: 3
TransporterDashboard.jsx:1679 - Assigned/Pending: 0
TransporterDashboard.jsx:1680 - Actual pending: 0
TransporterDashboard.jsx:1683 - Completion rate: 0.0%
TransporterDashboard.jsx:1684 === END DELIVERIES ANALYSIS ===
TransporterDashboard.jsx:1708 Current state values:
TransporterDashboard.jsx:1709 transportMetrics: {deliveryStats: Array(1), totalDeliveries: 3, completedDeliveries: 0, completionRate: '0.0', avgDeliveryTime: 24, …}
TransporterDashboard.jsx:1710 fuelData: {avgFuelEconomy: '12.7', monthlyFuelCost: 21040, co2Emissions: 363, totalDistance: 12148}
TransporterDashboard.jsx:1711 trends: [{…}]
TransporterDashboard.jsx:1712 activeTab: deliveries
