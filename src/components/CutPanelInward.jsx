// src/components/DPRPage.jsx
import React, { useState, useEffect, useRef } from "react";
// import DPRForm from "./DPRForm";
import axios from "axios";
import "../App.css";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Loader from "./Loader"; // adjust path if needed
// import Instruction from "./Instructions";
// import { FaPrint } from "react-icons/fa";
// import logo from "../assets/prisma-logo-2.png";
import { useUser } from "../contexts/UserContext";
import { FiPower } from "react-icons/fi"; // Feather Icons
import { FiRefreshCw } from "react-icons/fi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

let sizes = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "TOTAL"];
let displaySizes = sizes;


console.log(displaySizes);

function CutPanelInwardPage({ handleLogout }) {
  const [cutPanelForm, setCutPanelForm] = useState({
    fy: "",
    cpiNo: "",
    cpiDate: "",
    cpdNo: "",
    cpdDate: "",
    color: "",
    fabric: "",
    orderNo: "",
    iwPcs: "",
    cpiPrepBy: "",
    cc: "",
    cpiType: "",
    // ADD THESE:
    ItemName: "",
    Style: "",
    Size: "",
    IssueQty: "",
    fgpsStyle: "VL-T", // Default will be overwritten based on SINo

  });
  const [submittedData, setSubmittedData] = useState([]);
  const [fgpsStyleOptions, setFgpsStyleOptions] = useState(["VL-T", "FA-T", "IW-T"]);
  const [cpiOptions, setCpiOptions] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [typedCpiNo, setTypedCpiNo] = useState("");
  const [filteredCpiOptions, setFilteredCpiOptions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  // const [inputHighlight, setInputHighlight] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [itemNameOptions, setItemNameOptions] = useState([]);
  const cpiNoRef = useRef(null);
  const fyRef = useRef(null);
  const [entryData, setEntryData] = useState(null);
  const [entireEntryMas, setEntryMasRecords] = useState([]);
  const [selectedSizeData, setSelectedSizeData] = useState(null);
  // const fgpsDateRef = useRef(null);
  const [selectedEntryTableRowIndex, setSelectedRowIndex] = useState(null);
  const [selectedItemForForm, setSelectedItemForDPRForm] = useState(null);
  const [editable, setEditable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dprNo, setDprNo] = useState(""); // or null
  const [dprDate, setDprDate] = useState(""); // or null
  const [dprEntryBy, setDprEntryBy] = useState("");
  const [printedData, setPrintedData] = useState([]); // Track printed items
  const [filteredSize, setFilteredSize] = useState(null);
  const { userInfo } = useUser();
  const [rowLocks, setRowLocks] = useState({}); // { rowIndex: true/false }

  const toggleRowLock = (index) => {
    setRowLocks((prev) => ({
      ...prev,
      [index]: !prev[index], // toggle lock
    }));
  };

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 0-based index, so +1
  const currentYear = currentDate.getFullYear();

  // 1️⃣ Get financial year
  const fyStart = currentMonth < 4 ? currentYear - 1 : currentYear;
  const selectedFY = `${(fyStart).toString().slice(-2)}-${(fyStart + 1).toString().slice(-2)}`;
  const [selectedYear, setSelectedYear] = useState(selectedFY);


  // 2️⃣ Generate year options
  const startYear = currentYear - 1;
  const endYear = currentYear + 1;
  const years = [];
  for (let year = endYear; year >= startYear; year--) {
    years.push(year);
  }


  // const updateLineItemOWQty = (
  //   size,
  //   itemName,
  //   gp = 0,
  //   frp = 0,
  //   swrp = 0,
  //   mp = 0
  // ) => {
  //   // Sum based on editable status
  //   const isEditable =
  //     selectedItemForForm &&
  //     selectedItemForForm.sizes?.some((s) => s.SizeCode === size);
  //   // console.log(isEditable, selectedItemForForm.sizes);
  //   const enteredQty = gp + frp + swrp + mp;

  //   setLineItems((prevItems) =>
  //     prevItems.map((item) => {
  //       if (item.SSize === size && item.ItemName === itemName) {
  //         const issueQty = parseInt(item.IssueQty) || 0;
  //         const OwQty = parseInt(item.OwQty) || 0;

  //         if (enteredQty > issueQty) {
  //           console.warn(
  //             `❌ Entered Qty ${enteredQty} exceeds IssueQty ${issueQty}`
  //           );
  //           return { ...item, ComputedOWQty: "", BalQty: "" };
  //         }

  //         const balQty = issueQty - (enteredQty + OwQty);

  //         console.log(
  //           `✅ ${itemName}-${size} | Entered: ${enteredQty}, Balance: ${balQty}`
  //         );

  //         return {
  //           ...item,
  //           ComputedOWQty: enteredQty,
  //           BalQty: balQty === 0 ? 0 : balQty,
  //         };
  //       }

  //       return item;
  //     })
  //   );
  // };

  const updateLineItemOWQty = (
    size, // passed the key 
    itemName,
    gp = 0,
    frp = 0,
    swrp = 0,
    mp = 0,
    sizeLabel // optional label if numeric size
  ) => {
    const isEditable =
      editable &&
      selectedItemForForm.sizes?.some((s) => s.SizeCode === size);

    let enteredQty = gp + frp + swrp + mp;
    console.log('current size', size);

    if (isEditable) {
      const existing = selectedItemForForm.sizes.find((s) => {
        console.log('existingsizecode', s.SizeCode, 'current size', size);
        return s.SizeCode === size;
      });

      const originalGP = parseInt(existing?.GP) || 0;
      const originalFRP = parseInt(existing?.FRP) || 0;
      const originalSWRP = parseInt(existing?.SWRP) || 0;
      const originalMP = parseInt(existing?.MP) || 0;

      const originalAmount = originalGP + originalFRP + originalSWRP + originalMP;
      console.log('originalAmount', originalAmount);
      const deltaGP = gp - originalGP;
      const deltaFRP = frp - originalFRP;
      const deltaSWRP = swrp - originalSWRP;
      const deltaMP = mp - originalMP;

      enteredQty = (deltaGP) + (deltaFRP) + (deltaSWRP) + (deltaMP);
    }

    // 🟢 Normal update (your original logic preserved)
    setLineItems((prevItems) =>
      prevItems.map((item) => {

        const norm = v => String(v || "").trim();

        console.log("🔍 Comparing:", {
          itemSize: item.SSize,
          size,
          sizeLabel,
          itemName: item.ItemName,
          passedItemName: itemName
        });

        if (
          norm(item.ItemName) === norm(itemName) &&
          (norm(item.SSize) === norm(size) || (sizeLabel && norm(item.SSize) === norm(sizeLabel)))
        ) {
          // if ((item.SSize === size && item.ItemName === itemName) || (item.SSize === sizeLabel && item.ItemName === itemName)) { 
          console.log(item.SSize, typeof item.SSize, size, typeof size, item.ItemName, itemName);
          const issueQty = parseInt(item.IssueQty) || 0;
          const OwQty = parseInt(item.OwQty) || 0;

          // if (enteredQty > issueQty) {
          //   console.warn(
          //     `❌ Entered Qty ${enteredQty} exceeds IssueQty ${issueQty}`
          //   );
          //   return { ...item, ComputedOWQty: "", BalQty: "" };
          // }

          const balQty = issueQty - (enteredQty + OwQty);

          console.log(
            `✅ ${itemName}-${size} | Entered: ${enteredQty}, Balance: ${balQty}`
          );

          return {
            ...item,
            ComputedOWQty: enteredQty,
            BalQty: balQty === 0 ? 0 : balQty,
          };
        }

        return item;
      })
    );
  };



  // const units = ["CPIT", "CPIN"];
  // ✅ useEffect only for focusing
  useEffect(() => {
    if (fyRef.current) {
      fyRef.current.focus();  // Just focus
    }
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);

    // const fetchAll = async () => {
    //   try {
    //     const [entryMas, otherData] = await Promise.all([
    //       fetch("http://192.168.1.123:8080/name/api/getEntryMasByCpiNo.php").then(r => r.json())
    //       // ,fetch("http://192.168.1.123:8080/name/api/getSomethingElse.php").then(r => r.json())
    //     ]);

    //     console.log("✅ All data loaded:", entryMas, otherData);
    //   } catch (err) {
    //     console.error("❌ Error in fetchAll", err);
    //   } finally {
    //     setLoading(false);
    //   }
    // };

    // fetchAll();
  }, []);

  useEffect(() => {
    window._editable = editable;
  }, [editable]);


  useEffect(() => {
    if (!selectedYear) return; // Don't fetch until a year is selected
    const fetchCpiOptions = async () => {
      try {
        const res = await axios.post(
          "http://192.168.1.123:8080/name/api/IMS/get_all_cpino.php",
          { financialYear: selectedYear } // send FY value in body
        );

        if (res.data && Array.isArray(res.data.data)) {
          let filtered = res.data.data;

          if (userInfo?.LocationID === "001" || userInfo?.LocationID === "002") {
            filtered = res.data.data.filter((item) => {
              const sinoStr = item.SINo?.toString() ?? "";
              const prefixDigit = sinoStr.charAt(0);

              if (!/^\d$/.test(prefixDigit)) return false;

              const isOdd = parseInt(prefixDigit) % 2 === 1;
              return userInfo.LocationID === "001" ? isOdd : !isOdd;
            });
          }

          const options = filtered.map((item) => item.SINo);
          setCpiOptions(options);
          // const options = res.data.data.map((item) => item.SINo);
          // setCpiOptions(options);
        } else {
          console.error("Unexpected API format:", res.data);
        }
        // 🔹 Second API: get_all_entryMas.php
        const entryMasRes = await axios.post(
          "http://192.168.1.123:8080/name/api/get_all_entryMasT.php",
          {
            financialYear: selectedYear, locationID: userInfo?.LocationID
          }  //, FGPS: userInfo?.LocationID === "001" ? "VL-T-" : userInfo?.LocationID === "002" ? "VL-N-" : undefined
        );

        if (entryMasRes.data && Array.isArray(entryMasRes.data.data)) {
          setEntryMasRecords(entryMasRes.data.data); // ✅ Assuming you store full data
          console.log("Entire Entry Mas data:", entryMasRes.data);
        } else {
          console.error("Unexpected entryMas API format:", entryMasRes.data);
        }
      }
      // catch (error) {
      //   console.error("Error fetching CPI options:", error);
      // }
      catch (error) {
        if (error.response) {
          // Server responded with error code
          console.error("API error:", error.response.data);
        } else if (error.request) {
          // Request sent but no response
          console.error("No response received:", error.request);
        } else {
          // Something else happened
          console.error("Error setting up request:", error.message);
        }
      }
    };
    fetchCpiOptions();
  }, [selectedYear]);

  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2); // ✅ Gets last 2 digits
    return `${day}-${month}-${year}`;
  };
  const handleCpiInputChange = (e) => {
    const value = e.target.value;
    setTypedCpiNo(value);
    // setCutPanelForm((prev) => ({ ...prev, cpiNo: value }));

    if (value.trim() === "") {
      setFilteredCpiOptions([]);
      setShowDropdown(false);
      return;
    }

    const filtered = cpiOptions.filter((no) =>
      no.toLowerCase().startsWith(value.toLowerCase())
    );
    setFilteredCpiOptions(filtered);
    setShowDropdown(filtered.length > 0);
    setHighlightedIndex(0);
    setEditable(false);
  };

  const handleKeyDown = async (e) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredCpiOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCpiOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();

      if (filteredCpiOptions[highlightedIndex]) {
        const selectedCpi = filteredCpiOptions[highlightedIndex];
        setLoading(true);

        // Step 1: Select CPI No from dropdown
        handleSelectCpi(selectedCpi);

        // Step 2: Fetch entry data using selected CPI No
        const cleanedValue = selectedCpi.replace(/\D/g, "");
        if (cleanedValue.length > 0) {
          try {
            const fetchResponse = await fetch(
              "http://192.168.1.123:8080/name/api/getEntryMasByCpiNo.php",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cpiNo: parseInt(cleanedValue), financialYear: selectedYear }),
              }
            );
            const entry = await fetchResponse.json();
            console.log("📦 Entry from dropdown Enter:", entry);
            setEntryData(entry);
            // Optional: update form values too
            setCutPanelForm((prev) => ({
              ...prev,
              cpiNo: cleanedValue,
              cpiDate: entry.data[0]?.SIDate ?? "",
              orderNo: entry.data[0]?.OrderNo ?? "",
              color: entry.data[0]?.Color ?? "",
              cpiType: entry.data[0]?.CPIType ?? "",
              ItemName: entry.data[0]?.ItemName ?? "",
              // fgpsStyle: fgpsOptions[0], // ✅ Default initial

            }));
          } catch (err) {
            console.error("❌ Error fetching CPI entry from dropdown:", err);
          } finally {
            setLoading(false); // ✅ Guaranteed to run
          }
        }
      }
    }
  };

  // const handleCpiSelect = (cpi) => {
  //   setTypedCpiNo(cpi);
  //   setCutPanelForm((prev) => ({ ...prev, cpiNo: cpi }));
  //   setShowDropdown(false);
  //   fetchCPIDetails(cpi); // your existing API call
  // };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCutPanelForm((prev) => ({ ...prev, [name]: value }));
    if (name === "cpiNo" && value) {
      fetchCPIDetails(value);
    }
  };

  const handleSelectCpi = (selectedNo) => {
    setTypedCpiNo(selectedNo);
    setCutPanelForm((prev) => ({ ...prev, cpiNo: selectedNo }));
    setShowDropdown(false);
    setDprNo(""); // ✅ Reset DPR No
    setDprDate(""); // ✅ Reset DPR No
    setDprEntryBy("");
    fetchCPIDetails(selectedNo); // Optional: auto-fetch CPI details
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 150);
  };

  const handleRefresh = () => {
    if (loading) return; // prevent multiple clicks
    setLoading(true);

    fetch("http://192.168.1.123:8080/name/api/IMS/sync_cpi_data.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ FY: selectedYear }), // Send FY payload
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Refresh complete:", data);
      })
      .catch((err) => {
        console.error("Refresh failed:", err);
      })
      .finally(() => setLoading(false));
  };

  const fetchCPIDetails = async (cpiNo) => {
    try {
      setLoading(true);
      // Fetch first API: CPI details
      const res1 = await axios.post(
        "http://192.168.1.123:8080/name/api/IMS/get_cpino_details.php",
        { cpiNo, financialYear: selectedYear }
      );

      // Fetch second API: Sewing Line Item 
      const res2 = await axios.post(
        "http://192.168.1.123:8080/name/api/IMS/getSewingLineItem.php",
        { cpiNo, financialYear: selectedYear }
      );
      // Step 3: Fetch FGPSType mapping
      const res3 = await axios.post(
        "http://192.168.1.123:8080/name/api/IMS/fgpsType.php",
        { financialYear: selectedYear }
      );

      let updatedForm = { cpiNo };

      // Process CPI details response
      if (res1.data && res1.data.success && Array.isArray(res1.data.data)) {
        const details = res1.data.data[0];
        // for Temprary block for july 
        // const cpiDateStr = details.SIDate; // e.g., "2025-06-30"
        // const cpiDate = new Date(cpiDateStr);
        // const cutoffDate = new Date("2025-07-01"); // July 1, 2025

        // if (cpiDate < cutoffDate) {
        //   alert(`${formatDateToDDMMYYYY(cpiDateStr)} is before 1st July 2025`);

        //   // Clear and focus the input properly  
        //   if (cpiNoRef?.current) {
        //     cpiNoRef.current.focus();
        //   }
        //   // cpiNoRef.current.value = "";

        //   setLineItems([]); // Clear line items

        //   return; // ⛔ Stop further processing
        // }

        updatedForm = {
          ...updatedForm,
          cpiDate: details.SIDate || "",
          orderNo: details.OrderNo || "",
          color: details.Color || "",
          fabric: details.Fabric || "",
          iwPcs: details.TotalIssueQty || "",
          cpiPrepBy: details.PreparedBy || "",
          cc: details.CompCode || "",
          cpiType: details.CPIType || "",
          // fgpsStyle: fgpsOptions[0], // ✅ First one as default
        };
        // 🚨 OrderNo validation
        if (!updatedForm.orderNo || updatedForm.orderNo === "0") {
          alert("Order No is empty or 0. Please enter CPI No again.");

          // Clear both state and input
          setCutPanelForm(prev => ({
            ...prev,
            cpiNo: ""
          }));

          // Then focus
          setTimeout(() => {
            cpiNoRef?.current?.focus();
          }, 0);
          setLineItems([]); // Clear table if needed
          // setEntryData([]);
          return; // ⛔ Stop processing further
        }
      } else {
        console.error("Invalid data from CPI details API:", res1.data);
      }
      // 🔄 Prepare local map for FGPS type (safe and immediate)
      let fgpsTypeLocalMap = {};
      if (res3.data && res3.data.success && Array.isArray(res3.data.data)) {
        fgpsTypeLocalMap = Object.fromEntries(
          res3.data.data.map((item) => [item.ItemName, item.FGPSType])
        );
        console.log("FGPSType Map:", fgpsTypeLocalMap);
      }

      if (res2.data && res2.data.success && Array.isArray(res2.data.data)) {
        // const allItems = res2.data.data;
        const allItems = res2.data.data.map((item) => {
          const issueQty = parseInt(item.IssueQty) || 0;
          const owQty = parseInt(item.OwQty) || 0;

          return {
            ...item,
            IssueQty: issueQty,
            OwQty: owQty,
            BalQty: issueQty - owQty, // ✅ calculate balance quantity
          };
        });
        setLineItems(allItems);
        console.log("lineitems:", allItems);
        const distinctItemNames = [
          ...new Set(
            res2.data.data
              .filter((item) => parseInt(item.IssueQty) > 0)
              .map((item) => item.ItemName)
          ),
        ];
        // if (!editable) {
        setItemNameOptions(distinctItemNames);
        // Then, when BODY item is found:
        // if (distinctItemNames.some(name => name.startsWith("BODY"))) {
        //   // Map the ones you want to show (or rename them)
        //   displaySizes = ["28", "30", "32", "34", "36", "38", "40", "42", "44", "TOTAL"];
        // }
        // Now use `displaySizes` in your table rendering instead of `sizes`
        console.log(displaySizes);
        // console.log("ItemName from details:", distinctItemNames);
        // console.log("FGPSType Map:", fgpsTypeLocalMap);
        // console.log("itemType lookup result:", fgpsTypeLocalMap?.[distinctItemNames]);

        const itemType = fgpsTypeLocalMap?.[distinctItemNames]; // ✅ Use local map
        // console.log(itemType);
        const sino = parseInt(allItems[0].SINo ?? "0");
        const isEvenPrefix = Math.floor(sino / 10000) % 2 === 0;
        let fgpsOptions = isEvenPrefix
          ? ["VL-N", "FA-N", "IW-N"]
          : ["VL-T", "FA-T", "IW-T"];

        if (itemType === "VL") {
          fgpsOptions = fgpsOptions.map((opt) =>
            opt.startsWith("VL-") ? `VL-${isEvenPrefix ? "N" : "T"}` : opt
          );
        } else if (itemType === "FA") {
          fgpsOptions = fgpsOptions.map((opt) =>
            opt.startsWith("FA-") ? `FA-${isEvenPrefix ? "N" : "T"}` : opt
          );
        } else if (itemType === "IW") {
          fgpsOptions = fgpsOptions.map((opt) =>
            opt.startsWith("IW-") ? `IW-${isEvenPrefix ? "N" : "T"}` : opt
          );
        }

        // ✅ Move the matching prefix to the front
        const matchPrefix = `${itemType}-${isEvenPrefix ? "N" : "T"}`;
        fgpsOptions.sort((a, b) => {
          if (a === matchPrefix) return -1;
          if (b === matchPrefix) return 1;
          return 0;
        });

        // ✅ Set options and default
        setFgpsStyleOptions(fgpsOptions);
        setCutPanelForm((prev) => ({
          ...prev,
          fgpsStyle: fgpsOptions[0] ?? "",
        }));

        // }

        // ✅ Set the first item as default if available
        if (distinctItemNames.length > 0) {
          setCutPanelForm((prev) => ({
            ...prev,
            ItemName: distinctItemNames[0], // Set first item as default
          }));
        }

        // setLoading(false);

      } else {
        console.error("Invalid data from Sewing Line Item API:", res2.data);
        setLineItems([]); // Clear previous if invalid
      }

      setCutPanelForm((prev) => ({ ...prev, ...updatedForm }));
    } catch (error) {
      console.error("Error fetching CPI details:", error);
    } finally {
      setLoading(false); // ✅ Guaranteed to run
    }
  };
  // const fetchCPIDetails = async (cpiNo) => {
  //   try {
  //     setLoading(true);

  //     // Fetch all three APIs
  //     const [res1, res2, res3] = await Promise.all([
  //       axios.post(
  //         "http://192.168.1.123:8080/name/api/IMS/get_cpino_details.php",
  //         { cpiNo, financialYear: selectedYear }
  //       ),
  //       axios.post(
  //         "http://192.168.1.123:8080/name/api/IMS/getSewingLineItem.php",
  //         { cpiNo, financialYear: selectedYear }
  //       ),
  //       axios.post(
  //         "http://192.168.1.123:8080/name/api/IMS/fgpsType.php",
  //         { financialYear: selectedYear }
  //       ),
  //     ]);

  //     let updatedForm = { cpiNo };
  //     let distinctItemNames = [];
  //     let fgpsOptions = [];

  //     // ----- Process CPI details -----
  //     if (res1.data?.success && Array.isArray(res1.data.data)) {
  //       const details = res1.data.data[0];
  //       updatedForm = {
  //         ...updatedForm,
  //         cpiDate: details.SIDate || "",
  //         orderNo: details.OrderNo || "",
  //         color: details.Color || "",
  //         fabric: details.Fabric || "",
  //         iwPcs: details.TotalIssueQty || "",
  //         cpiPrepBy: details.PreparedBy || "",
  //         cc: details.CompCode || "",
  //         cpiType: details.CPIType || "",
  //       };
  //     } else {
  //       console.error("Invalid data from CPI details API:", res1.data);
  //     }

  //     // ----- Prepare FGPS type map -----
  //     let fgpsTypeLocalMap = {};
  //     if (res3.data?.success && Array.isArray(res3.data.data)) {
  //       fgpsTypeLocalMap = Object.fromEntries(
  //         res3.data.data.map((item) => [item.ItemName, item.FGPSType])
  //       );
  //     }

  //     // ----- Process Sewing Line Items -----
  //     if (res2.data?.success && Array.isArray(res2.data.data)) {
  //       const allItems = res2.data.data.map((item) => {
  //         const issueQty = parseInt(item.IssueQty) || 0;
  //         const owQty = parseInt(item.OwQty) || 0;
  //         return {
  //           ...item,
  //           IssueQty: issueQty,
  //           OwQty: owQty,
  //           BalQty: issueQty - owQty,
  //         };
  //       });
  //       setLineItems(allItems);

  //       // Extract distinct item names
  //       distinctItemNames = [
  //         ...new Set(
  //           res2.data.data
  //             .filter((item) => parseInt(item.IssueQty) > 0)
  //             .map((item) => item.ItemName)
  //         ),
  //       ];
  //       setItemNameOptions(distinctItemNames);

  //       // Determine FGPS style options
  //       const itemType = fgpsTypeLocalMap?.[distinctItemNames];
  //       const sino = parseInt(allItems[0]?.SINo ?? "0");
  //       const isEvenPrefix = Math.floor(sino / 10000) % 2 === 0;
  //       fgpsOptions = isEvenPrefix
  //         ? ["VL-N", "FA-N", "IW-N"]
  //         : ["VL-T", "FA-T", "IW-T"];

  //       if (itemType === "VL") {
  //         fgpsOptions = fgpsOptions.map((opt) =>
  //           opt.startsWith("VL-") ? `VL-${isEvenPrefix ? "N" : "T"}` : opt
  //         );
  //       } else if (itemType === "FA") {
  //         fgpsOptions = fgpsOptions.map((opt) =>
  //           opt.startsWith("FA-") ? `FA-${isEvenPrefix ? "N" : "T"}` : opt
  //         );
  //       } else if (itemType === "IW") {
  //         fgpsOptions = fgpsOptions.map((opt) =>
  //           opt.startsWith("IW-") ? `IW-${isEvenPrefix ? "N" : "T"}` : opt
  //         );
  //       }

  //       // Move matching prefix to front
  //       const matchPrefix = `${itemType}-${isEvenPrefix ? "N" : "T"}`;
  //       fgpsOptions.sort((a, b) => {
  //         if (a === matchPrefix) return -1;
  //         if (b === matchPrefix) return 1;
  //         return 0;
  //       });

  //       setFgpsStyleOptions(fgpsOptions);
  //     } else {
  //       console.error("Invalid data from Sewing Line Item API:", res2.data);
  //       setLineItems([]);
  //     }

  //     // ----- Single final state update -----
  //     setCutPanelForm((prev) => ({
  //       ...prev,
  //       ...updatedForm,
  //       fgpsStyle: fgpsOptions[0] ?? prev.fgpsStyle ?? "",
  //       ...(distinctItemNames.length > 0 && { ItemName: distinctItemNames[0] })
  //     }));
  //   } catch (error) {
  //     console.error("Error fetching CPI details:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const generateSizeMap = (item, editable) => {
    const sizeMap = {};

    sizes.forEach((sz) => {
      const match = item.sizes.find((s) => s.SizeCode === sz);
      const hasEditableValue = [
        "GP",
        "EP",
        "FRP",
        "SWRP",
        "MP",
        "WIP",
        "LP",
      ].some((field) => parseInt(match?.[field]) >= 0);

      sizeMap[sz] = {
        // "Bal Pcs": "",
        "Bal Pcs": match?.["BalPcs"]?.toString() || "",
        GP: match?.GP?.toString() || "",
        EP: match?.EP?.toString() || "",
        FRP: match?.FRP?.toString() || "",
        SWRP: match?.SWRP?.toString() || "",
        MP: match?.MP?.toString() || "",
        WIP: match?.WIP?.toString() || "",
        LP: match?.LP?.toString() || "",
        __readOnly: editable ? !hasEditableValue : true,
        __Editable: editable ? hasEditableValue : false, // only editable when true
      };
    });

    // Add TOTAL row
    sizeMap["TOTAL"] = sizes
      .filter((s) => s !== "TOTAL")
      .reduce(
        (total, sz) => {
          const row = sizeMap[sz];
          fields.forEach((field) => {
            total[field] = (total[field] || 0) + (parseInt(row[field]) || 0);
          });
          return total;
        },
        { __readOnly: true, __Editable: false }
      );
    return sizeMap;
  };

  const handleRowClick = (item, index) => {
    setSelectedRowIndex(index);
    setSelectedItemForDPRForm(item);
    // console.log(index);
    setEditable(false); // ✅ readonly mode

    if (!item.sizes || !Array.isArray(item.sizes)) return;

    const sizeMap = generateSizeMap(item, false); // read-only
    console.log("handleRowClick → sizeMap:", sizeMap);
    setSelectedSizeData(sizeMap);
  };
  const handleEditRow = (item, index) => {
    setSelectedRowIndex(index);
    setSelectedItemForDPRForm(item);
    setEditable(true); // ✅ editable mode
    console.log("handleEditRow → full item:", item); // 🔹 Log the entire object

    if (!item.sizes || !Array.isArray(item.sizes)) return;

    const editableSizeMap = generateSizeMap(item, true); // editable
    console.log("handleEditRow → editableSizeMap:", editableSizeMap);
    setSelectedSizeData(editableSizeMap);
  };
  const handlePrint = async (item, index) => {
    // Check if the item has already been printed
    const isAlreadyPrinted = printedData.some(
      (printedItem) => printedItem.EntrySizeID === item.EntrySizeID
    );

    if (isAlreadyPrinted) {
      alert("This size data has already been printed.");
      return; // Prevent further processing
    }

    if (Array.isArray(item.sizes)) {
      const allBarcodes = [];

      // Loop through each size and collect the barcode data
      for (let i = 0; i < item.sizes.length; i++) {
        const size = item.sizes[i];

        // Log the size details
        console.log(`Size ${i + 1}: SizeCode = ${size.SizeCode}, EntrySizeId = ${size.EntrySizeID}, LP = ${size.LP}`);

        // Prepare payload for each size entry based on LP
        const lpCount = size.LP; // Number of records to generate
        const barcodes = generateBarcodes(lpCount); // Function to generate unique barcodes

        // Prepare the payload for this size
        barcodes.forEach((barcode, idx) => {
          allBarcodes.push({
            EntrySizeID: size.EntrySizeID,
            SizeCode: size.SizeCode,
            LP: 1, // Keep LP as 1 for all generated barcodes
            Barcode: barcode,
          });
        });
      }

      // Now send all barcodes in a single request
      try {
        const response = await storeSizeBarcode(allBarcodes);
        console.log("All barcode records stored:", response);
      } catch (error) {
        console.error("Error storing barcode records:", error);
      }
    }

    // Trigger the print dialog (optional)
    // window.print();
  };

  // Helper function to generate unique barcodes
  const generateBarcodes = (count) => {
    const barcodes = [];
    for (let i = 0; i < count; i++) {
      // Generate a unique barcode (example: random string of 10 characters)
      barcodes.push(Math.random().toString(36).substring(2, 12).toUpperCase());
    }
    return barcodes;
  };

  // storeSizeBarcode function to call the API (example)
  const storeSizeBarcode = async (data) => {
    try {
      const response = await fetch("http://192.168.1.123:8080/name/api/storeSizeBarcode.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data), // Send the entire array of barcode data
      });

      if (!response.ok) {
        throw new Error("Failed to store size barcode");
      }

      return await response.json(); // Return the response from the API
    } catch (error) {
      throw error;
    }
  };

  return (

    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflowY: "auto",

      }}
    >
      {loading && <Loader />}
      <div style={{ flex: 1, padding: "10px" }}>
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            marginBottom: "0px",
            marginTop: "-1rem",
          }}
        >
          {/* Left side: logo + DPR span */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", maxHeight: "50px" }}>
            <img
              src="/prisma-logo-2.png"
              alt="Prisma Logo"
              style={{
                width: "120px",
                height: "80px",
                objectFit: "contain",
                marginLeft: "0.04rem",
                marginTop: "0.1rem",
              }}
            />
            <span
              style={{
                fontWeight: "bold",
                fontFamily: "Trebuchet MS",
                fontSize: "20px",
                color: "#000000ff",
                backgroundColor: "#add4c9ff",
                padding: "5px 10px",
                borderRadius: "6px",
                border: "1px solid black",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginTop: "0.1rem",
              }}
            >
              DPR
            </span>
          </div>

          {/* Center text */}
          {/* <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              fontWeight: "bold",
              fontSize: "18px",
            }}
          >
            Cut Panel Inward
          </div> */}
        </h2>

        <form
          // onSubmit={handleSubmit}
          style={{ fontSize: "13px", marginBottom: "10px", width: "90%", maxWidth: "740px" }}
        >
          <div style={{ textAlign: "center", width: "100%" }}>
            <span
              style={{
                fontWeight: "bold",
                fontSize: "18px",
                // fontFamily: "Cambria",
                color: "#1f51afff",
              }}
            >
              Cut Panel Inward
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "10px",
              rowGap: "18px",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <label style={{ fontSize: "14px", fontWeight: "bold" }}>
                FY:
              </label>
              <select
                value={selectedYear}
                ref={fyRef}
                onChange={(e) => setSelectedYear(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "NumpadEnter") {
                    e.preventDefault();
                    cpiNoRef.current?.focus();
                    // setInputHighlight(true);
                  }
                  console.log(fyRef.current.value);
                }}
                className="fy"
              >
                {/* <option value="">-- Select --</option> */}
                {years.map((year) => {
                  const shortStart = (year - 1).toString().slice(-2);
                  const shortEnd = year.toString().slice(-2);

                  return (
                    <option key={year} value={`${shortStart}-${shortEnd}`}>
                      {`${shortStart}-${shortEnd}`}
                    </option>
                  );
                })}

              </select>

              {/* <p>Selected Year: {selectedYear}</p> */}
            </div>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <label
                htmlFor="cpiNo"
                style={{ fontSize: "14px", fontWeight: "bold" }}
              >
                CPI No
              </label>
              <input
                type="text"
                name="cpiNo"
                className="cpi-no"
                id="cpiNo"
                maxLength={5}
                value={typedCpiNo}
                ref={cpiNoRef}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    handleCpiInputChange(e);
                  }
                }}
                onKeyDown={async (e) => {
                  // Allow only number keys and control keys
                  if (
                    !/[0-9]/.test(e.key) &&
                    ![
                      "Backspace",
                      "ArrowLeft",
                      "ArrowRight",
                      "Tab",
                      "Delete",
                      "Enter",
                    ].includes(e.key)
                  ) {
                    e.preventDefault();
                  }

                  // ✅ Only fetch when Enter is pressed
                  if (e.key === "Enter") {
                    try {
                      const res = await axios.post(
                        "http://192.168.1.123:8080/name/api/IMS/get_all_cpino.php",
                        { financialYear: selectedYear } // send FY value in body
                      );

                      if (res.data && Array.isArray(res.data.data)) {
                        let filtered = res.data.data;

                        if (userInfo?.LocationID === "001" || userInfo?.LocationID === "002") {
                          filtered = res.data.data.filter((item) => {
                            const sinoStr = item.SINo?.toString() ?? "";
                            const prefixDigit = sinoStr.charAt(0);

                            if (!/^\d$/.test(prefixDigit)) return false;

                            const isOdd = parseInt(prefixDigit) % 2 === 1;
                            return userInfo.LocationID === "001" ? isOdd : !isOdd;
                          });
                        }

                        const options = filtered.map((item) => item.SINo);
                        setCpiOptions(options);
                        // const options = res.data.data.map((item) => item.SINo);
                        // setCpiOptions(options);
                      }
                      const entryMasRes = await axios.post(
                        "http://192.168.1.123:8080/name/api/get_all_entryMasT.php",
                        {
                          financialYear: selectedYear, locationID: userInfo?.LocationID
                        }  //, FGPS: `${cutPanelForm.fgpsStyle}-`
                      );
                      if (
                        entryMasRes.data &&
                        Array.isArray(entryMasRes.data.data)
                      ) {
                        setEntryMasRecords(entryMasRes.data.data);
                        console.log("📦 Entire Entry Mas:", entryMasRes.data);
                      }
                    } catch (error) {
                      console.error("❌ Error fetching CPI data:", error);
                    }
                  }
                  // Preserve any additional logic you already had
                  handleKeyDown?.(e);
                }}
                onBlur={handleBlur}
                autoComplete="off"
                style={{
                  width: "50px",
                  backgroundColor: "rgb(140, 233, 86)",
                  padding: "4px",
                  fontSize: "13px",
                }}
                required
              />

              {showDropdown && (
                <ul
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50px",
                    width: "70px",
                    maxHeight: "218px",
                    overflowY: "auto",
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    margin: 0,
                    padding: "2px 0",
                    listStyle: "none",
                    zIndex: 1000,
                  }}
                >
                  {filteredCpiOptions.map((option, index) => (
                    <li
                      key={option}
                      onMouseDown={() => handleSelectCpi(option)}
                      style={{
                        padding: "4px 8px",
                        backgroundColor:
                          index === highlightedIndex ? "#e0e0e0" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label
                htmlFor="cpiDt"
                style={{ fontSize: "14px", fontWeight: "bold" }}
              >
                CPI Dt.
              </label>
              <input
                // type="date"
                name="cpiDate"
                id="cpiDt"
                value={formatDateToDDMMYYYY(cutPanelForm.cpiDate)}
                onChange={handleChange}
                style={{
                  width: "75px",
                  backgroundColor: "#e0e0e0",
                  outline: "none",
                  boxShadow: "none",
                  borderColor: "#ccc",
                  caretColor: "transparent",
                  marginRight: "7px",
                }}
                required
                readOnly
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label
                htmlFor="orderNo"
                style={{ fontSize: "14px", fontWeight: "bold" }}
              >
                Order No.
              </label>
              <input
                type="text"
                name="orderNo"
                id="orderNo"
                maxLength={6}
                value={cutPanelForm.orderNo}
                onChange={handleChange}
                style={{
                  width: "54px",
                  backgroundColor: "#e0e0e0",
                  outline: "none",
                  boxShadow: "none",
                  borderColor: "#ccc",
                  caretColor: "transparent",
                  marginRight: "7px",
                }}
                required
                readOnly
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label
                htmlFor="color"
                style={{ fontSize: "14px", fontWeight: "bold" }}
              >
                Color
              </label>
              <input
                type="text"
                name="color"
                id="color"
                value={cutPanelForm.color}
                onChange={handleChange}
                style={{
                  width: "110px",
                  backgroundColor: "#e0e0e0",
                  outline: "none",
                  boxShadow: "none",
                  borderColor: "#ccc",
                  caretColor: "transparent",
                  marginRight: "7px",
                }}
                required
                readOnly
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label
                htmlFor="fabric"
                style={{ fontSize: "14px", fontWeight: "bold" }}
              >
                Fabric
              </label>
              <input
                type="text"
                name="fabric"
                id="fabric"
                value={cutPanelForm.fabric}
                onChange={handleChange}
                style={{
                  width: "153px",
                  backgroundColor: "#e0e0e0",
                  outline: "none",
                  boxShadow: "none",
                  borderColor: "#ccc",
                  caretColor: "transparent",
                  marginRight: "7px",
                }}
                required
                readOnly
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label
                htmlFor="iwPcs"
                style={{ fontSize: "14px", fontWeight: "bold" }}
              >
                IW Pcs.
              </label>
              <input
                type="text"
                name="iwPcs"
                id="iwPcs"
                maxLength={4}
                value={cutPanelForm.iwPcs}
                onChange={handleChange}
                style={{
                  width: "43px",
                  backgroundColor: "#e0e0e0",
                  outline: "none",
                  boxShadow: "none",
                  borderColor: "#ccc",
                  caretColor: "transparent",
                }}
                required
                readOnly
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label
                htmlFor="cpiPrepBy"
                style={{ fontSize: "14px", fontWeight: "bold" }}
              >
                CPI Prep. by
              </label>
              <input
                type="text"
                name="cpiPrepBy"
                id="cpiPrepBy"
                value={cutPanelForm.cpiPrepBy}
                onChange={handleChange}
                style={{
                  width: "80px",
                  backgroundColor: "#e0e0e0",
                  outline: "none",
                  boxShadow: "none",
                  borderColor: "#ccc",
                  caretColor: "transparent",
                  marginRight: "7px",
                }}
                required
                readOnly
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label
                htmlFor="cc"
                style={{ fontSize: "14px", fontWeight: "bold" }}
              >
                CC
              </label>
              <input
                type="text"
                name="cc"
                id="cc"
                maxLength={5}
                value={cutPanelForm.cc}
                onChange={handleChange}
                style={{
                  width: "35px",
                  backgroundColor: "#e0e0e0",
                  outline: "none",
                  boxShadow: "none",
                  borderColor: "#ccc",
                  caretColor: "transparent",
                  marginRight: "7px",
                  // MozAppearance: "textfield", // Firefox
                  appearance: "textfield", // Chrome, Safari, Edge
                }}
                required
                readOnly
              />
            </div>

            {/* CPI Type - Read-only Input */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label
                htmlFor="unit"
                style={{ fontSize: "14px", fontWeight: "bold" }}
              >
                CPI Type
              </label>
              <input
                type="text"
                name="unit"
                id="unit"
                value={cutPanelForm.cpiType || ""} // Replace with the correct value from your form state
                readOnly
                style={{
                  width: "45px",
                  marginLeft: "1px",
                  backgroundColor: "#e0e0e0",
                  border: "1px solid #ccc",
                  outline: "none",
                  boxShadow: "none",
                  caretColor: "transparent",
                }}
              />
            </div>
            <div
              onClick={handleRefresh}
              style={{
                cursor: loading ? "not-allowed" : "pointer",
                display: "inline-block",
              }}
            >
              <FiRefreshCw
                size={25}
                style={{
                  marginLeft: "1px",
                  color: "#2563eb",
                  transition: "transform 0.5s",
                  transform: loading ? "rotate(360deg)" : "none",
                }}
              />
            </div>


            {/* <button
              type="submit"
              style={{
                padding: "6px 12px",
                backgroundColor: "#0a66c2",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginLeft: "10px",
                height: "32px",
              }}
            >
              Submit
            </button> */}
          </div>
        </form>

        {
          lineItems.length > 0 && (
            <div style={{ marginTop: "20px", height: "270px", width: "780px" }}>
              <table
                border="1"
                cellPadding="6"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  backgroundColor: "#fff",
                }}
              >
                <thead
                  style={{ backgroundColor: "#f0f0f0", textAlign: "center" }}
                >
                  <tr>
                    <th style={{ width: "10px", textAlign: "center" }}>S No</th>
                    <th style={{ width: "30px", textAlign: "center" }}>CPI No</th>
                    <th>Item Name</th>
                    <th style={{ width: "55px", textAlign: "center" }}>
                      Style No
                    </th>
                    <th style={{ textAlign: "center" }}>Color</th>
                    <th style={{ width: "30px", textAlign: "center" }}>Size</th>
                    <th style={{ width: "30px", textAlign: "center" }}>IW Pcs</th>
                    <th style={{ width: "30px", textAlign: "center" }}>OW Pcs</th>
                    <th style={{ width: "30px", textAlign: "center" }}>
                      Cur. OW
                    </th>
                    <th style={{ width: "30px", textAlign: "center" }}>
                      Bal Pcs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems
                    .filter((item) => parseInt(item.IssueQty) !== 0)
                    .map((item, idx) => {
                      const isSelected = filteredSize === item.SSize;
                      // console.log(isSelected);
                      return (
                        <tr
                          key={idx}
                          onClick={() =>
                            setFilteredSize(isSelected ? "" : item.SSize)
                          }
                          style={{
                            cursor: "pointer",
                            backgroundColor: isSelected ? "#d0ebff" : "white",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = "#e8f4ff";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = "white";
                          }}
                        >
                          <td style={{ textAlign: "center" }}>{idx + 1}</td>
                          <td style={{ textAlign: "center" }}>{item.SINo}</td>
                          <td>{item.ItemName}</td>
                          <td style={{ textAlign: "center" }}>{item.Style}</td>
                          <td style={{ textAlign: "center" }}>{item.Color}</td>
                          <td style={{ textAlign: "center" }}>{item.SSize}</td>
                          <td style={{ textAlign: "right" }}>{item.IssueQty}</td>
                          <td style={{ textAlign: "right" }}>{item.OwQty}</td>
                          <td style={{ textAlign: "right" }}>{item.ComputedOWQty}</td>
                          <td style={{
                            textAlign: "right", color: parseInt(item.BalQty) < 0 ? "red" : "inherit",
                          }}>
                            {parseInt(item.BalQty) < 0 ? item.BalQty?.toString() : item.BalQty}
                          </td>
                        </tr>
                      );
                    })}

                  {/* ✅ Total Row */}
                  <tr style={{ fontWeight: "bold", backgroundColor: "#f9f9f9" }}>
                    <td colSpan={6} style={{ textAlign: "right", paddingRight: "10px" }}>
                      Total
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {lineItems.reduce(
                        (sum, item) => sum + (parseInt(item.IssueQty) || 0),
                        0
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {lineItems.reduce(
                        (sum, item) => sum + (parseInt(item.OwQty) || 0),
                        0
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {lineItems.reduce(
                        (sum, item) => sum + (parseInt(item.ComputedOWQty) || 0),
                        0
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {lineItems.reduce((sum, item) => {
                        const val = parseInt(item.BalQty);
                        return sum + (isNaN(val) || val < 0 ? 0 : val);
                      }, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        }
        {/* Entry Table */}
        <div style={{ textAlign: "center" }}>
          {/* {error && (
            <p style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>
              {error}
            </p>
          )} */}
          {/* {submitted && (
            <p style={{ color: "green", fontSize: "12px", marginTop: "6px" }}>
              ✅ Form submitted successfully!
            </p>
          )} */}
          {entryData &&
            entryData.data.length > 0 &&
            Array.isArray(entryData.data) && (
              <div style={{
                maxHeight: "440px",  // Set max height for the container
                maxWidth: "1250px",
                overflowY: "auto",  // Enable vertical scrolling if content exceeds
                position: "absolute",
              }}>
                {/* <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>
                Submitted Form Data
              </h3> */}

                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    fontSize: "13px",
                    backgroundColor: "#b0bec2ff",
                    marginBottom: "20px",
                    // marginTop: "45px",
                    whiteSpace: "nowrap",
                  }}
                  border="1"
                  cellPadding="6"
                >
                  <thead style={{
                    backgroundColor: "#ddd",
                    position: "sticky",
                    top: "0",  // Fix the header to the top
                    zIndex: 0, // Ensure the header stays above the table body
                  }}>
                    <tr>
                      <th style={{ textAlign: "center", width: "50px" }} rowSpan={2}>CPI No</th>
                      <th style={{ textAlign: "center", width: "65px" }} rowSpan={2}>FGPS</th>
                      <th style={{ textAlign: "center", width: "65px" }} rowSpan={2}>Order No</th>
                      <th style={{ textAlign: "center", width: "65px" }} rowSpan={2}>DPR No</th>
                      <th style={{ textAlign: "center", width: "65px" }} rowSpan={2}>DPR Dt</th>
                      <th style={{ textAlign: "center", width: "85px" }} rowSpan={2}>Inscan Date</th>
                      <th style={{ textAlign: "center", width: "35px" }} rowSpan={2}>GP</th>
                      <th style={{ textAlign: "center", width: "35px" }} rowSpan={2}>EP</th>
                      <th style={{ textAlign: "center", width: "35px" }} rowSpan={2}>FRP</th>
                      <th style={{ textAlign: "center", width: "35px" }} rowSpan={2}>SWRP</th>
                      <th style={{ textAlign: "center", width: "35px" }} rowSpan={2}>MP</th>
                      <th style={{ textAlign: "center", width: "35px" }} rowSpan={2}>WIP</th>

                      {/* Size headers row 1 */}
                      {["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"].map(size => (
                        <th key={size} style={{ textAlign: "center" }}>{size}</th>
                      ))}

                      <th style={{ textAlign: "center" }} rowSpan={2}>LP</th>
                      <th style={{ textAlign: "center" }} rowSpan={2}>RP</th>
                      <th style={{ textAlign: "center", width: "60px" }} rowSpan={2}>Edit</th>
                      <th style={{ textAlign: "center", width: "60px" }} rowSpan={2}>AL</th>
                      <th style={{ textAlign: "center", width: "60px" }} rowSpan={2}>AO</th>
                    </tr>
                    <tr>
                      {/* Size labels row 2 */}
                      {["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"].map(size => (
                        <th key={size} style={{ textAlign: "center" }}>
                          {sizeLabels[size]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entryData.data
                      .filter((item) => {
                        if (!filteredSize) return true;

                        const sizeStr = String(filteredSize).trim();
                        const isNumeric = /^\d+$/.test(sizeStr);

                        // Determine the size code to match against
                        const sizeCode = isNumeric
                          ? Object.keys(sizeLabels).find(key => sizeLabels[key] === sizeStr) || sizeLabels[sizeStr]
                          : sizeStr;

                        // console.log("🔍 Checking item:", {
                        //   filteredSize,
                        //   isNumeric,
                        //   sizeCode,
                        //   sizesAvailable: item.sizes?.map(s => s.SizeCode)
                        // });

                        const matched = item.sizes?.find(s => s.SizeCode === sizeCode);

                        return matched && (
                          matched.GP > 0 ||
                          matched.EP > 0 ||
                          matched.FRP > 0 ||
                          matched.SWRP > 0 ||
                          matched.MP > 0
                        );
                      })

                      .map((item, index) => {
                        const rp =
                          (parseInt(item.Total_FRP) || 0) +
                          (parseInt(item.Total_SWRP) || 0) +
                          (parseInt(item.Total_MP) || 0);

                        return (
                          <tr
                            key={index}
                            onClick={() => handleRowClick(item, index)}
                            style={{
                              backgroundColor:
                                selectedEntryTableRowIndex === index
                                  ? "#d0ebff"
                                  : "transparent",
                              cursor: "pointer",
                            }}
                          >
                            <td>{item.SINo}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{item.FGPS}</td>
                            <td>{item.OrderNo}</td>
                            <td>{item.EntryNo}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{formatDateToDDMMYYYY(item.EntryTime)}</td>
                            {/* <td>{item.CPIType}</td> */}
                            {/* <td>{item.Color}</td> */}
                            {/* <td>{item.ItemName}</td> */}
                            <td style={{ whiteSpace: "nowrap" }} >{formatDateToDDMMYYYY(item.InscanDate)}</td>
                            {/* <td>{formatDateToDDMMYYYY(item.StichingDate)}</td> */}
                            <td>{item.Total_GP}</td>
                            <td>{item.Total_EP}</td>
                            <td>{item.Total_FRP}</td>
                            <td>{item.Total_SWRP}</td>
                            <td>{item.Total_MP}</td>
                            <td>{item.Total_WIP}</td>
                            {sizes
                              .filter((sz) => sz !== "TOTAL")
                              .map((sz) => {
                                const matched = item.sizes?.find(
                                  (s) => s.SizeCode === sz
                                );

                                const shouldHighlight = (() => {
                                  if (!filteredSize) return false;

                                  const sizeStr = String(filteredSize).trim();
                                  const isNumeric = /^\d+$/.test(sizeStr);

                                  // Map numeric size (e.g., "28") to its size code (e.g., "M") if needed
                                  const sizeCode = isNumeric
                                    ? Object.keys(sizeLabels).find(key => sizeLabels[key] === sizeStr) || sizeLabels[sizeStr]
                                    : sizeStr;

                                  return (
                                    sz === sizeCode && // match column size
                                    matched &&
                                    (matched.GP > 0 ||
                                      matched.EP > 0 ||
                                      matched.FRP > 0 ||
                                      matched.SWRP > 0 ||
                                      matched.MP > 0)
                                  );
                                })();

                                // return <td key={sz}>{matched?.GP || ""}</td>;

                                return (
                                  <td key={sz}
                                    style={{
                                      backgroundColor: shouldHighlight ? "#d1e7dd" : "transparent",
                                      fontWeight: shouldHighlight ? "bold" : "normal",
                                      color: shouldHighlight ? "#0f5132" : "inherit",
                                    }} >
                                    {matched?.GP > 0 ? matched.GP : ""}
                                  </td>
                                );
                              })}
                            <td>{item.Total_LP}</td>
                            <td>{rp > 0 ? rp : ""}</td>
                            <td>
                              <button
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "14px",
                                  backgroundColor: "#4CAF50",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation(); // ✅ Prevents triggering row click
                                  handleEditRow(item, index);
                                }}
                              >
                                Edit
                              </button>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <Tippy
                                content={
                                  userInfo?.isAdmin
                                    ? rowLocks[index]
                                      ? "Unlock"
                                      : "Lock"
                                    : "Only admins can lock/unlock"
                                }
                                placement="left"
                              >
                                <span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!userInfo?.isAdmin) return; // block non-admins
                                      toggleRowLock(index);
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: userInfo?.isAdmin ? "pointer" : "not-allowed",
                                      opacity: userInfo?.isAdmin ? 1 : 0.5,
                                    }}
                                    disabled={!userInfo?.isAdmin} // prevent click
                                  >
                                    {rowLocks[index] ? (
                                      <FontAwesomeIcon icon={faLock} size="lg" color="#333" />
                                    ) : (
                                      <FontAwesomeIcon icon={faLockOpen} size="lg" color="#333" />
                                    )}
                                  </button>
                                </span>
                              </Tippy>
                            </td>

                            <td>
                              <button
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "14px",
                                  backgroundColor: "#0a66c2",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: userInfo?.isAdmin ? "pointer" : "not-allowed",
                                  opacity: userInfo?.isAdmin ? 1 : 0.5,
                                }}
                                onClick={(e) => {
                                  if (!userInfo?.isAdmin) return; // ❌ block if not admin
                                  e.stopPropagation();
                                  // handleEditRow(item, index);
                                }}
                                disabled={!userInfo?.isAdmin}
                              >
                                AO
                              </button>
                            </td>


                            {/* <td><FaPrint
                            onClick={(e) => {
                              e.stopPropagation(); // ✅ Prevents triggering row click
                              handlePrint(item, index);
                            }}
                            style={{
                              fontSize: "24px",
                              color: "#333",
                              cursor: "pointer",
                              // marginLeft: "1rem",
                            }}
                            title="Print"
                          /></td> */}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                {/* {submitted && (
                <>
                  <h3 style={{ fontSize: "15px", marginBottom: "8px" }}>
                    Size Breakdown (TOTAL)
                  </h3>
                  <table
                    style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: "13px",
                      backgroundColor: "#fdfdfd",
                    }}
                    border="1"
                    cellPadding="6"
                  >
                    <thead style={{ backgroundColor: "#eee" }}>
                      <tr>
                        <th>Size</th>
                        {fields.map((field) => (
                          <th key={field}>{field}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>TOTAL</td>
                        {fields.map((field) => (
                          <td key={field} style={{ textAlign: "right" }}>
                            {totalFields[field]}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </>
              )} */}
              </div>
            )}
        </div>
      </div >

      <div style={{ flex: 1, padding: "9px", borderLeft: "none" }}>
        <div
          style={{
            display: "flex",
            // justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "-12px",
          }}
        >
          {/* Spacer for left side to balance */}
          <div style={{ width: "510px" }}></div>
          {/* Center Title */}
          {/* <h2 style={{ fontSize: "18px", margin: 0, textAlign: "center", flex: 1 }}>
            Garment Outward
          </h2> */}
          <span
            style={{
              fontSize: "18px",
              color: "#292929ff",
              backgroundColor: "#add4c9ff",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid black",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              whiteSpace: "nowrap", // Prevent wrapping
              marginTop: "-15px",
            }}
          >
            Welcome:<span style={{ fontWeight: 800 }}>{userInfo?.FName}</span> (
            <span style={{ fontWeight: 800 }}>{userInfo?.EmpID}</span>) Location:<span style={{ fontWeight: 800 }}>{userInfo?.Location}</span>
          </span>
          <button onClick={handleLogout} className="logout-button" >
            <FiPower size={25} />
          </button>
        </div>
        <DPRForm
          cutPanelForm={cutPanelForm}
          setCutPanelForm={setCutPanelForm}
          itemNameOptions={itemNameOptions}
          lineItems={lineItems}
          setLineItems={setLineItems} // 👈 needed to clear lineItems
          cpiNoRef={cpiNoRef} // 👈 needed to focus cpiNo
          updateLineItemOWQty={updateLineItemOWQty} // ✅ make sure this is passed!
          setTypedCpiNo={setTypedCpiNo} // ✅ pass this too!
          entryData={entryData}
          setEntryData={setEntryData} // ✅ pass as prop
          entireEntryMas={entireEntryMas}
          formatDateToDDMMYYYY={formatDateToDDMMYYYY} // ✅ pass it as prop
          selectedSizeData={selectedSizeData} // ✅ add this line
          setSelectedRowIndex={setSelectedRowIndex}
          editable={editable}
          setEditable={setEditable} // ✅ pass this
          selectedItemForForm={selectedItemForForm}
          fetchCPIDetails={fetchCPIDetails} // ⬅️ Pass it down
          selectedYear={selectedYear}
          fgpsStyleOptions={fgpsStyleOptions}
          dprNo={dprNo}
          setDprNo={setDprNo}
          dprDate={dprDate}
          setDprDate={setDprDate}
          dprEntryBy={dprEntryBy}
          setDprEntryBy={setDprEntryBy}
          setFilteredSize={setFilteredSize}
        // handleLogout={handleLogout} 
        />
        <FilterComponent
          cutPanelForm={cutPanelForm}
          selectedYear={selectedYear} /> {/* ← Make sure this line exists */}
      </div>
    </div >
  );
}

// if (displaySizes
// ) {
//   displaySizes = sizes
//     .filter(size => !["2XS", "L", "M"].includes(size)) // remove sizes you don’t want
//     .map(size => {
//       switch (size) {
//         case "XS": return "28";
//         case "S": return "30";
//         case "XL": return "32";
//         case "2XL": return "34";
//         case "3XL": return "36";
//         case "4XL": return "38";
//         default: return size;
//       }
//     });
// }

// let sizes = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "TOTAL"];
const sizeGroups = [
  displaySizes.slice(0, Math.ceil(displaySizes.length / 2)),
  displaySizes.slice(Math.ceil(displaySizes.length / 2))
];
const sizeLabels = {
  "2XS": "28",
  "XS": "30",
  "S": "32",
  "M": "34",
  "L": "36",
  "XL": "38",
  "2XL": "40",
  "3XL": "42",
  "4XL": "44"
};

const fields = ["Bal Pcs", "GP", "EP", "FRP", "SWRP", "MP", "WIP", "LP"];

const initialFormState = {
  cpiNumber: "",
  inscanDate: "",
  unit: "",
  stitchingDate: "",
  orderNumber: "",
  fgpsNumber: "",
  fgpsStyle: "VL",
  fgpsDate: "2025-01-01",
  colour: "",
  style: "",
  entryMasId: null, // 👈 this will tell if you're updating
  sizeData: sizes.reduce((acc, size) => {
    acc[size] = fields.reduce((facc, field) => {
      facc[field] = "";
      return facc;
    }, {});
    return acc;
  }, {}),
};

// const formatDate = (dateStr) => {
//   if (!dateStr) return "";
//   const date = new Date(dateStr);
//   if (isNaN(date.getTime())) return "Invalid Date"; // Handle bad date strings

//   const day = String(date.getDate()).padStart(2, "0");
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const year = String(date.getFullYear()).slice(-2);
//   return `${day}/${month}/${year}`;
// };

const AutocompleteInput = ({ name, value, onChange, options, onEnter }) => {
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1); // Track highlighted item

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    if (
      (name === "colour" || name === "style") &&
      /[^a-zA-Z\s]/.test(inputValue)
    )
      return;

    onChange({ target: { name, value: inputValue } });

    if (inputValue) {
      const sortedFiltered = options
        .filter((opt) => opt.toLowerCase().startsWith(inputValue.toLowerCase()))
        .sort();
      setFilteredOptions(sortedFiltered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const handleOptionClick = (option) => {
    onChange({ target: { name, value: option } });
    setShowDropdown(false);
  };
  const handleKeyDown = (e) => {
    if (!showDropdown || filteredOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0) {
        handleOptionClick(filteredOptions[highlightIndex]);
        setTimeout(() => {
          if (onEnter) onEnter(); // move to next field after selecting
        }, 0);
      } else {
        if (onEnter) onEnter(); // no suggestion selected, just move
      }
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", textAlign: "left" }}>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown} // ✅ attach the handler here
        placeholder={name}
        autoComplete="off"
        style={{ width: "100%", textAlign: "left" }}
      />
      {showDropdown && filteredOptions.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: "4px",
            position: "absolute",
            top: "100%",

            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ccc",
            maxHeight: "150px",
            overflowY: "auto",
            fontSize: "13px",
            zIndex: 10,
          }}
        >
          {filteredOptions.map((opt, index) => (
            <li
              key={opt}
              onClick={() => handleOptionClick(opt)}
              style={{
                padding: "4px",
                cursor: "pointer",
                backgroundColor: highlightIndex === index ? "#d0e0f0" : "white",
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

function DPRForm({
  cutPanelForm,
  itemNameOptions,
  setCutPanelForm,
  lineItems,
  setLineItems, // 👈 Add this
  cpiNoRef, // 👈 And this
  updateLineItemOWQty,
  setTypedCpiNo,
  entryData,
  setEntryData,
  entireEntryMas,
  formatDateToDDMMYYYY,
  selectedSizeData,
  setSelectedRowIndex, // 👈 add this new prop
  editable,
  setEditable,
  selectedItemForForm,
  fetchCPIDetails,
  selectedYear,
  fgpsStyleOptions,
  dprNo,
  setDprNo,
  dprDate,
  setDprDate,
  dprEntryBy,
  setDprEntryBy,
  setFilteredSize
}) {
  const [form, setForm] = useState(initialFormState);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [highlightedSizesOnClick, setHighlightedSizes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fgpsRef = useRef(null);
  const fgpsStyleRef = useRef(null);
  const fgpsDateRef = useRef(null); // ✅ Add this for FGPS Dt.

  const unitRef = useRef(null);
  const colourRef = useRef(null);
  const styleRef = useRef(null);
  const inputRefs = useRef({});
  const inscanRef = useRef(null);
  const stitchingRef = useRef(null);
  const itemNameRef = useRef(null);
  const submitButtonRef = useRef(null);
  const noButtonRef = useRef(null);
  const yesButtonRef = useRef(null);
  const highlightFields = ["GP", "EP", "FRP", "SWRP", "MP"];
  const currentYear = new Date().getFullYear(); // e.g., 2025
  const { userInfo } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false); // ✅ flag
  // const [isCpiClosed, setIsCpiClosed] = useState(false);


  // const [isSizeNumber, setIsNumeric] = useState(false);
  // log ONLY when entryData changes
  const lastRecord =
    entryData?.success && Array.isArray(entryData.data) && entryData.data.length > 0
      ? entryData.data[entryData.data.length - 1]
      : null;

  // const isCloseCpiDisabled = lastRecord ? Number(lastRecord.Total_WIP) > 0 : false;
  // ✅ Disable if no entryData OR if WIP > 0
  // const isCloseCpiDisabled = !lastRecord || Number(lastRecord.Total_WIP) > 0 ;

  const lastRecordWIP = Number(lastRecord?.Total_WIP) || 0;
  // const anySizeWIP = Object.values(form.sizeData).some((sizeObj) => {
  //   console.log("Current size Total_WIP:", sizeObj["WIP"]);
  //   return Number(sizeObj["Total_WIP"]) > 0;
  // });

  const totalRow = computeTotalRow(); // { Total_GP: ..., Total_WIP: ..., ... }

  // Check if any WIP > 0
  const anySizeWIP = totalRow.Total_WIP === 0;
  console.log("Last Record WIP: ", lastRecordWIP, "Computed total WIP:", totalRow.Total_WIP, "anySizeWIP:", anySizeWIP);

  console.log(anySizeWIP);
  const isCloseCpiDisabled = !lastRecord || lastRecordWIP > "0"; // || !anySizeWIP

  // 👇 directly derived, no useEffect needed
  const isCpiClosed = lastRecord?.isCpiClosed === "1";
  // 👇 derived directly from lastRecord
  // const isCpiClosed = lastRecord?.isCpiClosed === "1";

  // useEffect(() => {
  //   if (lastRecord) {
  //     setIsCpiClosed(lastRecord.isCpiClosed === "1");
  //   }
  //   console.log("✅ EntryData changed:", entryData);
  //   // console.log("Last Record:", lastRecord);
  console.log("isCloseCpiDisabled:", isCloseCpiDisabled);
  //   // console.log("isCpiClosed:", isCpiClosed);
  // }, [entryData, lastRecord]);
  // useEffect(() => {
  //   if (entryData) {

  //   }
  // }, [entryData, lastRecord]);


  // const fieldToTotalKey = {
  //   GP: "Total_GP",
  //   EP: "Total_EP",
  //   FRP: "Total_FRP",
  //   SWRP: "Total_SWRP",
  //   MP: "Total_MP",
  //   WIP: "Total_WIP",
  // };
  // console.log("📦 entryData:", entryData);

  // const totalFields = fields.reduce((acc, field) => {
  //     if (!entryData?.data || entryData.data.length === 0) return {};

  //   const key = fieldToTotalKey[field];
  //   acc[field] = key
  //     ? entryData.data?.reduce(
  //         (sum, item) => sum + (parseInt(item[key]) || 0),
  //         0
  //       )
  //     : 0; // Default 0 if no such total field (like "Bal Pcs")
  //   return acc;
  // }, {});
  function formatDprDate(sqlDate) {
    const date = new Date(sqlDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2); // get last 2 digits
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // convert 0 to 12 for 12 AM
    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
  }

  // ✅ Declare this outside the DPRForm component
  // const updateWIP = (size, sizeData, setForm) => {
  //   const fieldsToSubtract = ["GP", "FRP", "SWRP", "MP"];
  //   const balPcs = parseInt(sizeData[size]["Bal Pcs"]) || 0;

  //   const subtractTotal = fieldsToSubtract.reduce((sum, field) => {
  //     return sum + (parseInt(sizeData[size][field]) || 0);
  //   }, 0);

  //   const wip = balPcs - subtractTotal;

  //   setForm((prev) => ({
  //     ...prev,
  //     sizeData: {
  //       ...prev.sizeData,
  //       [size]: {
  //         ...prev.sizeData[size],
  //         WIP: wip.toString(),
  //       },
  //     },
  //   }));
  // };

  const updateSewingLineQty = async ({
    SINo,
    ItemName,
    SSize,
    OwQty,
    BalQty,
  }) => {
    try {
      const response = await fetch(
        "http://192.168.1.123:8080/name/api/updateSewingLine.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            SINo,
            ItemName,
            SSize,
            OwQty,
            BalQty,
            financialYear: selectedYear,
            UpdatedBy: userInfo.FName
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        console.log(`✅ Updated SewingLine for ${ItemName}-${SSize}`);
      } else {
        console.error("❌ Update failed:", result.message);
      }
    } catch (error) {
      console.error("🚨 API error:", error);
    }
  };

  // useEffect(() => {
  //   if (submitted && entryData && Array.isArray(entryData.data)) {
  //     console.log("📦 lineItems:", lineItems);

  //     lineItems.forEach((item) => {
  //       const { SINo, ItemName, SSize, ComputedOWQty, OwQty, BalQty } = item;

  //       // Use fallback 0 if value is null/undefined/empty
  //       const updatedComputedQty =
  //         (parseInt(ComputedOWQty) || 0) + (parseInt(OwQty) || 0);

  //       console.log("✅ Updated ComputedQty:", updatedComputedQty);

  //       updateSewingLineQty({
  //         SINo,
  //         ItemName,
  //         SSize,
  //         OwQty: updatedComputedQty,
  //         BalQty,
  //       });
  //     });
  //   }
  // }, [submitted, entryData, lineItems]);
  // Use selectedItem as needed
  // 👇 useEffect to show entryData
  // Show data in console when dropdown entryData changes



  useEffect(() => {
    if (selectedItemForForm) {
      setForm((prev) => ({
        ...prev,
        fgpsNumber: selectedItemForForm.FGPSNo || "",
        fgpsStyle: selectedItemForForm.FGPS?.split("-")[0] || "",
        fgpsDate: selectedItemForForm.FGPSDate || "",
        stitchingDate: selectedItemForForm.StitchingDate || "",
        inscanDate: selectedItemForForm.InscanDate || "",
        cpiNumber: selectedItemForForm.SINo || "",
        entryMasId: selectedItemForForm.EntryMasId, // 👈 Set it here
        // add more fields as needed
      }));
      setDprNo(selectedItemForForm.EntryNo);
      setDprDate(selectedItemForForm.EntryTime);
      setDprEntryBy(selectedItemForForm.EntryBy);
    }
  }, [selectedItemForForm]);

  useEffect(() => {
    if (showConfirmation && noButtonRef.current) {
      noButtonRef.current.focus();
    }
  }, [showConfirmation]);
  useEffect(() => {
    if (selectedSizeData) {
      setForm((prev) => ({
        ...prev,
        sizeData: selectedSizeData,
      }));

      const highlightFields = ["Bal Pcs", "GP", "EP", "FRP", "SWRP", "MP"];

      // 🔹 Extract only sizes where at least one field > 0
      const sizesToHighlight = Object.entries(selectedSizeData)
        .filter(([size, fields]) =>
          highlightFields.some((field) => {
            const value = parseInt(fields[field]);
            return !isNaN(value) && value > 0;
          })
        )
        .map(([size]) => size);

      setHighlightedSizes(sizesToHighlight);
    }
  }, [selectedSizeData]);

  // Log cutPanelForm whenever it changes
  // useEffect(() => {
  //   console.log("cutPanelForm data:", cutPanelForm);
  //   console.log("Line Items inside dpr form:", lineItems);
  // }, [cutPanelForm]);

  useEffect(() => {
    if (cutPanelForm.cpiNo) {
      handleClear(); // Clear form every time CPI No changes
    }
  }, [cutPanelForm.cpiNo]);

  useEffect(() => {
    if (!itemNameOptions.length || !lineItems.length) return;

    if (itemNameOptions.length === 1) {
      // console.log("Triggered Single ItemName");
      whenOneItemName(); // Directly use the logic for one item
    } else if (itemNameOptions.length > 1) {
      // Simulate selecting the first option (trigger existing onChange)
      const event = {
        target: { value: itemNameOptions[0] },
      };
      itemNameRef.current?.dispatchEvent(
        new Event("change", { bubbles: true })
      );
      itemNameRef.current?.focus(); // Optional: focus select field
    }
  }, [itemNameOptions]);
  // Check sizeData whenever it changes
  // useEffect(() => {
  //   const hasValue = Object.values(formState.sizeData).some((sizeObj) =>
  //     Object.values(sizeObj).some((val) => val !== "" && val !== null)
  //   );
  //   setIsCloseDisabled(hasValue); // disable if any value exists
  // }, [form.sizeData]);

  // const hasInitialized = useRef(false); // ⬅️ Declare at the top of the component

  const whenOneItemName = () => {
    // if (hasInitialized.current) return;
    if (itemNameOptions.length !== 1 || !lineItems?.length) return;

    const selectedItem = itemNameOptions[0];

    setCutPanelForm((prev) => ({ ...prev, ItemName: selectedItem }));

    const clearedSizeData = {};
    Object.keys(form.sizeData).forEach((size) => {
      clearedSizeData[size] = {};
      Object.keys(form.sizeData[size]).forEach((field) => {
        clearedSizeData[size][field] = "";
      });
    });

    const updatedSizeData = updateIWPcs(
      selectedItem,
      lineItems,
      clearedSizeData
    );

    setForm((prev) => ({
      ...prev,
      sizeData: updatedSizeData,
    }));

    // Focus the FGPS Style field after setting default ItemName
    setTimeout(() => fgpsStyleRef.current?.focus(), 0);

    // hasInitialized.current = true;
  };

  // const hasInitialized = useRef(false); // 🟡 Add this outside useEffect

  // useEffect(() => {
  //   if (!itemNameOptions.length || !lineItems?.length) return;

  //   const selectedItem = itemNameOptions[0];

  //   setCutPanelForm((prev) => ({ ...prev, ItemName: selectedItem }));

  //   // ❗️Instead of passing form.sizeData, reset a clean version of sizeData
  //   const clearedSizeData = {};
  //   Object.keys(form.sizeData).forEach((size) => {
  //     clearedSizeData[size] = {};
  //     Object.keys(form.sizeData[size]).forEach((field) => {
  //       clearedSizeData[size][field] = "";
  //     });
  //   });

  //   const updatedSizeData = updateIWPcs(
  //     selectedItem,
  //     lineItems,
  //     clearedSizeData
  //   );

  //   setForm((prev) => ({
  //     ...prev,
  //     sizeData: updatedSizeData,
  //   }));

  //   // Focus logic
  //   if (itemNameOptions.length === 1) {
  //     setTimeout(() => fgpsStyleRef.current?.focus(), 0);
  //   } else {
  //     setTimeout(() => itemNameRef.current?.focus(), 0);
  //   }
  //   // hasInitialized.current = true; // 🟢 Mark as done so it doesn't run again
  // }, [itemNameOptions, lineItems]);

  //logic
  const updateIWPcs = (selectedItemName, lineItems, currentSizeData) => {
    const updatedSizeData = { ...currentSizeData };

    // Step 1: Clear all fields and set all rows as read-only by default
    Object.keys(updatedSizeData).forEach((size) => {
      Object.keys(updatedSizeData[size]).forEach((field) => {
        updatedSizeData[size][field] = "";
      });
      updatedSizeData[size].__readOnly = true;
      updatedSizeData[size].__Editable = false; // 🔹 NEW FLAG
    });

    // Step 2: Enable only matching sizes with issueQty > 0
    lineItems.forEach((item) => {
      if (item.ItemName === selectedItemName) {
        const size = item.SSize;
        const qty = Number(item.BalQty); // can be 0
        const issueQty = Number(item.IssueQty); // can be 0 or undefined

        // if (!updatedSizeData[size]) return;
        // Special case: If SSize is numeric, map it to size label and allow editing

        if (issueQty > 0) { // here before readonly is true when issueQty > 0
          // Check if numeric size and map to label
          const numericSizeMatch = size.match(/^\d+$/); // only digits
          if (numericSizeMatch) {
            // setIsNumeric(true);
            // console.log("🔍 Checking numeric size:", size);
            // console.log("📋 sizeLabels map:", sizeLabels);
            // console.log("🎯 Looking for:", Number(size));

            // const mappedLabel = Object.keys(sizeLabels).find((label) => {
            //   console.log(`   🔄 Comparing: ${label} -> ${sizeLabels[label]}`);
            //   return sizeLabels[label] === (size);
            // });

            // console.log("🔗 Mapped label:", mappedLabel);
            const mappedLabel = Object.keys(sizeLabels).find(
              (label) => sizeLabels[label] === (size)
            );
            // console.log("🔍 All updatedSizeData keys:", Object.keys(updatedSizeData));
            // console.log("🔗 Raw size from API:", size, "| type:", typeof size);
            // console.log("🔗 Mapped label:", JSON.stringify(mappedLabel), "| type:", typeof mappedLabel);

            if (mappedLabel) {
              const normalizedLabel = mappedLabel.trim();
              if (updatedSizeData[normalizedLabel]) {
                updatedSizeData[normalizedLabel]["Bal Pcs"] = qty;
                updatedSizeData[normalizedLabel]["WIP"] = qty;
                updatedSizeData[normalizedLabel].__readOnly = isCpiClosed ? true : false;//false
                updatedSizeData[normalizedLabel].__Editable = isCpiClosed ? false : true; //true
                console.log(`✅ Editing enabled for numeric: ${normalizedLabel}`, typeof normalizedLabel);
                return;
              } else {
                console.warn("⚠️ No exact match for normalized label:", normalizedLabel);
              }
            }
          }
          if (updatedSizeData[size]) {

            updatedSizeData[size]["Bal Pcs"] = qty;
            updatedSizeData[size]["WIP"] = qty;
            // updatedSizeData[size].__readOnly = qty === 0;
            updatedSizeData[size].__readOnly = isCpiClosed ? true : false; // false
            updatedSizeData[size].__Editable = isCpiClosed ? false : true; //true // 🔹 EP editable only if issueQty > 0
            console.log("Normal Size character", size, typeof size);
          }
        } else {
          if (updatedSizeData[size]) {

            updatedSizeData[size]["Bal Pcs"] = "";
            updatedSizeData[size]["WIP"] = "";
            updatedSizeData[size].__readOnly = true;
            updatedSizeData[size].__Editable = false;
          }
          console.log(`⛔ Skipped size ${size}: issueQty = ${issueQty}`);
        }
      }
    });

    return updatedSizeData;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if ((name === "colour" || name === "style") && /[^a-zA-Z\s]/.test(value))
      return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberOnlyInput = (e) => {
    const { name, value } = e.target;
    const cleanedValue = value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, [name]: cleanedValue }));
    // handleClear();
  };

  const handleSizeChange = (size, field, value) => {
    const sanitizedValue = value.replace(/\D/g, "").slice(0, 4);

    // Step 1: Update form
    setForm((prev) => {
      const newSizeData = {
        ...prev.sizeData,
        [size]: {
          ...prev.sizeData[size],
          [field]: sanitizedValue,
        },
      };

      // Update WIP
      if (["GP", "FRP", "SWRP", "MP", "EP"].includes(field)) {
        const balPcs = parseInt(newSizeData[size]["Bal Pcs"]) || 0;
        let gp = parseInt(newSizeData[size]["GP"]) || 0;
        const frp = parseInt(newSizeData[size]["FRP"]) || 0;
        const swrp = parseInt(newSizeData[size]["SWRP"]) || 0;
        const mp = parseInt(newSizeData[size]["MP"]) || 0;
        let ep = parseInt(newSizeData[size]["EP"]) || 0;
        // Recalculate LP only if GP or EP changes


        // If GP > Bal Pcs
        // if (!editable) {
        if (balPcs < 0) {
          ep = gp;
          newSizeData[size]["EP"] = ep.toString();
        } else if (gp > balPcs) {
          const excess = gp - balPcs;
          // const exactGp = gp - excess;
          // gp = exactGp;
          ep = excess;
          // newSizeData[size]["GP"] = exactGp.toString();
          newSizeData[size]["EP"] = excess.toString();
        } else {
          // ❗ Only clear EP if it's not manually entered
          if ((newSizeData[size]["EP"] ?? "") === "" || form.sizeData[size]["EP"] === newSizeData[size]["EP"]) {
            newSizeData[size]["EP"] = "";
            ep = 0;
          }
        }
        // }
        // if (["EP", "GP"].includes(field)) {
        //   console.log('EP : ', ep);
        const lp = (gp) % 5;
        newSizeData[size]["LP"] = lp.toString();
        // }


        // const totalProduced = gp + frp + swrp + mp;
        // // if(!form.sizeData[size]?.__epEditable) { totalProduced =  gp + frp + swrp + mp };
        // const totalProducedForEditable = frp + swrp + mp;
        // // ✅ Main logic:
        // if (editable) {
        //   console.log("inside the editable");
        //   const matched = selectedItemForForm?.sizes?.find(
        //     (s) => s.SizeCode === size
        //   );
        //   const oldGP = parseInt(matched?.GP) || 0;
        //   const oldWIP = parseInt(matched?.WIP) || 0;

        //   const diff = gp - oldGP; // ➕ if increased, ➖ if reduced
        //   newSizeData[size]["WIP"] = (
        //     oldWIP -
        //     (diff + totalProducedForEditable)
        //   ).toString();
        // } else {
        //   newSizeData[size]["WIP"] = (balPcs - totalProduced).toString(); // original logic
        // }
        const totalProduced = gp + frp + swrp + mp;
        const totalProducedForEditable = frp + swrp + mp;

        if (editable) {
          console.log("inside the editable");
          const matched = selectedItemForForm?.sizes?.find(
            (s) => s.SizeCode === size
          );

          const oldGP = parseInt(matched?.GP) || 0;
          const oldFRP = parseInt(matched?.FRP) || 0;
          const oldSWRP = parseInt(matched?.SWRP) || 0;
          const oldMP = parseInt(matched?.MP) || 0;
          const oldWIP = parseInt(matched?.WIP) || 0;

          // Calculate differences
          const diffGP = gp - oldGP;
          const diffFRP = frp - oldFRP;
          const diffSWRP = swrp - oldSWRP;
          const diffMP = mp - oldMP;

          const totalDiff = diffGP + diffFRP + diffSWRP + diffMP;

          newSizeData[size]["WIP"] = (oldWIP - totalDiff).toString();
        } else {
          newSizeData[size]["WIP"] = (balPcs - totalProduced).toString(); // original logic
        }

      }

      return {
        ...prev,
        sizeData: newSizeData,
      };
    });

    // Step 2: Call external update OUTSIDE of setForm
    // if (field === "GP" && updateLineItemOWQty) {
    //   updateLineItemOWQty(size, sanitizedValue, cutPanelForm.ItemName);
    // }
  };

  // const isFormValid = () => {
  //   const {
  //     cpiNumber,
  //     inscanDate,
  //     unit,
  //     stitchingDate,
  //     orderNumber,
  //     fgpsNumber,
  //     colour,
  //     style,
  //   } = form;

  //   const isAlpha = (str) => /^[a-zA-Z\s]+$/.test(str);

  //   return (
  //     cpiNumber &&
  //     inscanDate &&
  //     unit &&
  //     stitchingDate &&
  //     orderNumber &&
  //     fgpsNumber &&
  //     colour &&
  //     style &&
  //     isAlpha(colour) &&
  //     isAlpha(style)
  //   );
  // };

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   if (isFormValid()) {
  //     setSubmitted(true);
  //     setError("");
  //     console.log("Form Submitted", form);
  //   } else {
  //     let msg = "Please fill in all required fields.";
  //     if (!/^[a-zA-Z\s]+$/.test(form.colour))
  //       msg = "❌ Colour must contain only letters.";
  //     else if (!/^[a-zA-Z\s]+$/.test(form.style))
  //       msg = "❌ Style must contain only letters.";
  //     setSubmitted(false);
  //     setError(msg);
  //   }
  // };
  const isFormValid = () => {
    const { fgpsNumber, inscanDate, stitchingDate } = form;

    const isNumeric = (str) => /^\d+$/.test(str);

    return fgpsNumber && isNumeric(fgpsNumber) && inscanDate && stitchingDate;
  };
  // const computeTotalRow = () => {
  //   const totalRow = {};

  //   fields.forEach((field) => {
  //     const sum = sizes
  //       .filter((sz) => sz !== "TOTAL") // exclude TOTAL from computation
  //       .reduce(
  //         (acc, sz) => acc + (parseInt(form.sizeData[sz][field]) || 0),
  //         0);

  //     totalRow[`Total_${field}`] = sum;
  //   });

  //   return totalRow;
  // };
  function computeTotalRow() {
    // const computeTotalRow = () => {
    const totalRow = {};

    fields.forEach((field) => {
      const sum = sizes
        .filter((sz) => sz !== "TOTAL")
        .reduce((acc, sz) => {
          const raw = (form.sizeData[sz][field] || "").toString().trim();
          let val = parseInt(raw);

          if (isNaN(val)) val = 0;

          // ✅ Skip negative WIP values completely
          if ((field === "WIP" || field === "Bal Pcs") && val < 0) {
            console.log(`Skipping negative WIP value: ${val} for size: ${sz}`);
            return acc; // Don't add to sum
          }

          return acc + val;
        }, 0);

      totalRow[`Total_${field}`] = sum;
    });
    return totalRow;
  };





  const totals = computeTotalRow();

  const sizeDataWithTotal = {
    ...form.sizeData,
    TOTAL: {
      ...Object.keys(totals).reduce((acc, key) => {
        const field = key.replace("Total_", "");
        acc[field] = totals[key];
        return acc;
      }, {}),
      __readOnly: true,
      __Editable: false,
    },
  };
  const fetchSewingLineItems = async (cpiNo, selectedYear) => {
    try {
      const res = await axios.post(
        "http://192.168.1.123:8080/name/api/IMS/getSewingLineItem.php",
        { cpiNo, financialYear: selectedYear }
      );

      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        const allItems = res.data.data.map((item) => {
          const issueQty = parseInt(item.IssueQty) || 0;
          const owQty = parseInt(item.OwQty) || 0;

          return {
            ...item,
            IssueQty: issueQty,
            OwQty: owQty,
            BalQty: issueQty - owQty,
          };
        });

        setLineItems(allItems);
        console.log("📦 Line Items from Sewing:", allItems);
      }
    } catch (error) {
      console.error("❌ Error fetching line items:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Prevent multiple clicks
    if (isSubmitting) return;

    setIsSubmitting(true); // 🔐 lock the form
    setLoading(true);

    const totalFields = computeTotalRow();
    console.log("🔍 Flattened TOTAL row:", totalFields); // ✅ You'll see actual values now
    // console.log("editable", editable ? sizeDataWithTotal : "");
    const sourceSizeData = sizeDataWithTotal;
    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0]; // "YYYY-MM-DD"
    // Merge values from cutPanelForm into form before sending
    const finalForm = {
      // ...form,
      financialYear: selectedYear,
      SINo: cutPanelForm.cpiNo,
      SIDate: cutPanelForm.cpiDate,
      CPIType: cutPanelForm.cpiType,
      ItemName: cutPanelForm.ItemName,
      OrderNo: cutPanelForm.orderNo,
      FGPSNo: form.fgpsNumber,
      FGPSDate: anySizeWIP ? formattedToday : form.fgpsDate,
      InScanDate: anySizeWIP ? formattedToday : form.inscanDate,
      StitchingDate: anySizeWIP ? formattedToday : form.stitchingDate,
      Color: cutPanelForm.color,
      FGPS: `${cutPanelForm.fgpsStyle}-${form.fgpsNumber}`, //anySizeWIP ? "" : 
      ...totalFields, // ✅ Inject totals here
      entryMasId: form.entryMasId,
      LocationID: userInfo.LocationID,
      EntryBy: userInfo.FName,

      sizeData: Object.keys(sourceSizeData).reduce((acc, size) => {
        if (size === "TOTAL") {
          acc["TOTAL"] = sourceSizeData["TOTAL"];
        } else {
          const row = sourceSizeData[size];
          const hasData = ["GP", "EP", "FRP", "SWRP", "MP", "WIP", "LP"].some(
            (field) => parseInt(row[field]) >= 0
          );
          if (hasData) {
            acc[size] = row;
          }
        }
        return acc;
      }, {}),
    };
    console.log(finalForm);
    console.log("📦 Size Breakdown (sizeData):", finalForm.sizeData);
    console.log('istotalWIP becomes 0  beofre form valid', anySizeWIP);
    if (anySizeWIP || isFormValid(finalForm)) {//(!isCloseCpiDisabled) || (isCloseCpiDisabled && )
      console.log('istotalWIP becomes 0  after form valid', anySizeWIP);
      try {
        const isUpdate = editable;
        console.log("isUpdate", isUpdate);
        const url = isUpdate
          ? "http://192.168.1.123:8080/name/api/updateDprEntryAndSize.php"
          : "http://192.168.1.123:8080/name/api/saveEntry.php";

        console.log(
          isUpdate ? "🔁 Updating existing entry" : "🆕 Submitting new entry"
        );

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalForm),
        });

        // Handle invalid JSON / HTTP errors gracefully
        // if (!response.ok) {
        //   throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        // }

        const data = await response.json();
        console.log("✅ API Response:", data);

        if (data.success) {
          setDprNo(data.EntryNo);
          setDprDate(data.EntryTime);
          setDprEntryBy(data.EntryBy);
          // Step 1: Update sewing line quantities BEFORE submitting the form
          const updatePromises = [];

          lineItems.forEach((item) => {
            const { SINo, ItemName, SSize, ComputedOWQty, OwQty, BalQty } = item;

            const updatedComputedQty =
              (parseInt(ComputedOWQty) || 0) + (parseInt(OwQty) || 0);

            console.log(
              `✅ ${ItemName}-${SSize}: ComputedQty = ${updatedComputedQty}`
            );

            // Push each update call into an array of promises
            updatePromises.push(
              updateSewingLineQty({
                SINo,
                ItemName,
                SSize,
                OwQty: updatedComputedQty,
                BalQty,
              })
            );
          });

          // Wait for all sewing line updates to complete
          await Promise.all(updatePromises);
          setSubmitted(true); // Show submitted section
          alert(
            isUpdate
              ? "✔️ Data Updated successfully!"
              : "✔️ Data saved successfully!"
          );

          // const message = isUpdate
          //   ? "✔️ Data Updated successfully!"
          //   : "✔️ Data saved successfully!";
          // if (isCloseCpiDisabled) {
          //   // ✅ Normal alert when validation was required
          //   alert(message);
          // } else {
          //   // ✅ Ask confirmation when validation skipped
          //   const confirmClose = window.confirm(
          //     `${message}\n\nDo you want to close CPI?`
          //   );

          //   if (confirmClose) {
          //     await closeCPI({
          //       EntryMasId: entryMasId,
          //       FY: selectedYear,
          //       SINo: sino,
          //     });
          //   }
          // }
          // setShowConfirmation(true); // Show confirmation dialog

          const cpiNo = parseInt(cutPanelForm.cpiNo);
          console.log("After success: ", cpiNo, typeof cpiNo);

          //   try {
          //   // fetchSewingLineItems(cpiNo, selectedYear); // ✅ only this part
          //   const fetchResponse = await fetch(
          //     "http://192.168.1.123:8080/name/api/getEntryMasByCpiNo.php",
          //     {
          //       method: "POST",
          //       headers: {
          //         "Content-Type": "application/json",
          //       },
          //       body: JSON.stringify({ cpiNo: cpiNo }), // 👈 Send cpiNo in request body
          //     }
          //   );
          //   const entry = await fetchResponse.json();
          //   console.log("📦 Fetched Entry:", entry);
          //   entryData(entry);
          // } catch (err) {
          //   console.error("❌ Error fetching saved data:", err);
          // }
          try {
            const [entryRes] = await Promise.all([
              fetch("http://192.168.1.123:8080/name/api/getEntryMasByCpiNo.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cpiNo, financialYear: selectedYear }),
              }),
              fetchSewingLineItems(cpiNo, selectedYear),
            ]);

            const entry = await entryRes.json();
            // setDprNo("");
            console.log("📦 Fetched Entry:", entry, entry.data[0].EntryMasId);

            setEntryData(entry);

          } catch (err) {
            console.error("❌ Error during post-submit fetching:", err);
          }

        } else {
          alert((data.error || "Unknown error"));
        }
      } catch (err) {
        console.error("❌ Submission error:", err);
        alert("❌ Submission failed. Please try again.");
      } finally {
        setIsSubmitting(false); // 🔓 unlock after complete
        setLoading(false);
      }
      // ✅ Clear only cpiNo and focus it
      // setCutPanelForm((prev) => ({
      //   ...prev,
      //   cpiNo: "",
      // }));
      setTypedCpiNo(""); // ✅ clear the actual input field

      if (cpiNoRef.current) {
        cpiNoRef.current.focus();
      }

      // ✅ Clear lineItems here directly
      // setLineItems([]); // or reset to defaultLineItems if needed

      // ✅ Or call handleClear if you already have one
      handleClear();
    } else {
      setError("❌ Please fill valid required fields");
    }
    // setSubmitted(true);
  };
  function DPRConfirmation({ message, onYes, onNo }) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <div className="bg-white p-6 rounded shadow-md w-80 text-center">
          <p className="mb-4">{message}</p>
          <div className="flex justify-around">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded"
              autoFocus
              onClick={onYes}
            >
              Yes
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={onNo}
            >
              No
            </button>
          </div>
        </div>
      </div>
    );
  }
  // const handleExcelExport = async () => {
  //   try {
  //     const response = await fetch(
  //       "http://192.168.1.123:8080/name/api/getEntryMasByCpiNo.php",
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ cpiNo: cutPanelForm.cpiNo }),
  //       }
  //     );

  //     const result = await response.json();

  //     if (!result.success || !result.data?.length) {
  //       alert("❌ No data found or export failed.");
  //       return;
  //     }

  //     // Extract unique sizes
  //     const sizeSet = new Set();
  //     result.data.forEach((entry) => {
  //       (entry.sizes || []).forEach((size) => {
  //         if (size.SizeCode) sizeSet.add(size.SizeCode);
  //       });
  //     });
  //     const sizes = Array.from(sizeSet).sort();
  //     const sizeFields = ["GP", "EP", "FRP", "MP", "LP"];

  //     // Create workbook and worksheet
  //     const workbook = new ExcelJS.Workbook();
  //     const worksheet = workbook.addWorksheet("DPR Export");

  //     // Freeze pane: top 2 rows and left 7 columns
  //     worksheet.views = [{ state: "frozen", xSplit: 8, ySplit: 2 }];

  //     // Header rows
  //     const firstRow = [
  //       "SINo",
  //       "FGPS",
  //       "OrderNo",
  //       "InscanDate",
  //       "StitchingDate",
  //       "ItemName",
  //       "Total_GP",
  //       "Total_EP",
  //       "Total_FRP",
  //       "Total_SWRP",
  //       "Total_MP",
  //       "Total_WIP",
  //       ...sizes.flatMap((size) => Array(sizeFields.length).fill(size)),
  //     ];

  //     const secondRow = [
  //       "",
  //       "",
  //       "",
  //       "",
  //       "",
  //       "",
  //       "",
  //       "",
  //       "",
  //       "",
  //       "",
  //       "",
  //       ...sizes.flatMap(() => sizeFields),
  //     ];

  //     worksheet.addRow(firstRow);
  //     worksheet.addRow(secondRow);

  //     // Merge size headers
  //     let col = 15; // Starting index (1-based in ExcelJS)
  //     sizes.forEach(() => {
  //       worksheet.mergeCells(1, col, 1, col + sizeFields.length - 1);
  //       col += sizeFields.length;
  //     });

  //     // Style headers
  //     [1, 2].forEach((rowNumber) => {
  //       const row = worksheet.getRow(rowNumber);
  //       row.height = 15;  // Set row height
  //       row.eachCell((cell) => {
  //         cell.font = { bold: true };
  //         cell.alignment = { horizontal: "center", vertical: "middle" };
  //         // cell.border = {
  //         //   top: { style: "thin" },
  //         //   left: { style: "thin" },
  //         //   bottom: { style: "thin" },
  //         //   right: { style: "thin" },
  //         // };
  //       });
  //     });

  //     // Fill rows
  //     result.data.forEach((entry) => {
  //       const base = [
  //         entry.SINo,
  //         entry.FGPS,
  //         entry.OrderNo,
  //         entry.InscanDate,
  //         entry.StitchingDate,
  //         entry.ItemName,
  //         entry.Total_GP,
  //         entry.Total_EP,
  //         entry.Total_FRP,
  //         entry.Total_SWRP,
  //         entry.Total_MP,
  //         entry.Total_WIP,
  //       ];

  //       const sizeMap = {};
  //       (entry.sizes || []).forEach((size) => {
  //         const code = size.SizeCode;
  //         if (!sizeMap[code]) {
  //           sizeMap[code] = { GP: 0, EP: 0, FRP: 0, MP: 0, LP: 0 };
  //         }
  //         sizeMap[code].GP += parseInt(size.GP) || 0;
  //         sizeMap[code].EP += parseInt(size.EP) || 0;
  //         sizeMap[code].FRP += parseInt(size.FRP) || 0;
  //         sizeMap[code].MP += parseInt(size.MP) || 0;
  //         sizeMap[code].LP += parseInt(size.LP) || 0;
  //       });

  //       const sizeData = sizes.flatMap((size) => {
  //         const s = sizeMap[size] || {};
  //         return sizeFields.map((f) => {
  //           const val = s[f] ?? "";
  //           return val === 0 ? "" : val;
  //         });
  //       });

  //       worksheet.addRow([...base, ...sizeData]);
  //     });

  //     // Auto width for all columns
  //     worksheet.columns.forEach((column) => {
  //       let maxLength = 5;
  //       column.eachCell({ includeEmpty: true }, (cell) => {
  //         const val = cell.value ? cell.value.toString() : "";
  //         maxLength = Math.max(maxLength, val.length);
  //       });
  //       column.width = maxLength + 2;
  //     });

  //     // Export Excel file
  //     const buffer = await workbook.xlsx.writeBuffer();
  //     const blob = new Blob([buffer], {
  //       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //     });
  //     const firstSINo = result.data[0]?.SINo || "UNKNOWN";

  //     // Format date and time
  //     const now = new Date();
  //     const dd = String(now.getDate()).padStart(2, "0");
  //     const mm = String(now.getMonth() + 1).padStart(2, "0");
  //     const yy = String(now.getFullYear()).slice(2);
  //     const hh = String(now.getHours()).padStart(2, "0");
  //     const min = String(now.getMinutes()).padStart(2, "0");

  //     const fileName = `DPR_(${firstSINo})${dd}${mm}${yy}_${hh}${min}.xlsx`;

  //     saveAs(blob, fileName);
  //   } catch (err) {
  //     console.error("❌ Export failed:", err);
  //     alert("❌ Export failed. Check console.");
  //   }
  // };

  const handleClear = () => {
    setForm(initialFormState);
    setSubmitted(false);
    // setIsNu
    setFilteredSize(null);
    setSelectedRowIndex(null);
    setHighlightedSizes([]);
    setError("");
    setEditable(false);
  };
  const handleCloseFGPS = () => {
    console.log("🔒 FGPS closed");
  };
  const handleFGPSDateFetchAndDuplicateCheck = () => {
    if (!Array.isArray(entireEntryMas)) return;
    console.log("🔒 FGPS check entre");

    const formFGPSNo = parseInt(form.fgpsNumber);
    const formFGPS = `${cutPanelForm.fgpsStyle}-${form.fgpsNumber}`;
    const formCpiNo = parseInt(cutPanelForm.cpiNo);
    // console.log("entireEntryMas:", entireEntryMas); // should be a non-empty array
    // console.log("formFGPSNo:", formFGPSNo);
    // console.log("formFGPS:", formFGPS);
    // console.log("🔁 Starting .find() in entireEntryMas...");
    const match = entireEntryMas.find((item) => {
      const apiFGPSNo = parseInt(item.FGPSNo);
      const apiFGPS = item.FGPS;

      // console.log(`🔍 Checking item:`, item);
      // console.log(`➡️ Comparing: apiFGPSNo (${apiFGPSNo}) === formFGPSNo (${formFGPSNo}), apiFGPS (${apiFGPS}) === formFGPS (${formFGPS})`);

      return apiFGPSNo === formFGPSNo && apiFGPS === formFGPS;
    });

    console.log("✅ Match found:", match);

    if (match) {
      const isDuplicate = entireEntryMas.some((item) => {
        const apiFGPSNo = parseInt(item.FGPSNo);
        const apiFGPS = item.FGPS;
        const apiSINo = parseInt(item.SINo);
        return (
          apiFGPSNo === formFGPSNo &&
          apiFGPS === formFGPS &&
          apiSINo === formCpiNo
        );
      });

      if (isDuplicate && !editable) {
        alert("⚠️ Duplicate record found for same CPI No and FGPS No.");
        setForm((prev) => ({
          ...prev,
          fgpsNumber: "",
        }));
        setTimeout(() => {
          fgpsRef.current?.focus();
        }, 0);
        return;
      }

      // ✅ Not duplicate — set dates
      setForm((prev) => ({
        ...prev,
        inscanDate: match.InscanDate || "",
        stitchingDate: match.StitchingDate || "",
        fgpsDate: match.FGPSDate || "",
      }));

      setTimeout(() => {
        fgpsDateRef.current?.focus();
      }, 0);
    } else {
      // No match
      console.warn("❌ No match found for FGPS No:", form.fgpsNumber);
      const fallbackDate = `${currentYear}-01-01`;
      setForm((prev) => ({
        ...prev,
        inscanDate: fallbackDate,
        stitchingDate: fallbackDate,
        fgpsDate: fallbackDate,
      }));

      fgpsDateRef.current?.focus();
    }
  };
  // Close CPI function
  const OpenOrcloseCpi = async ({ EntryMasId, FY, SINo, isCpiClosed, isAdmin }) => {
    if (!EntryMasId || !FY || !SINo) {
      console.warn("Missing parameters for toggleCPI:", { EntryMasId, FY, SINo });
      return;
    }

    // Determine action: close or open
    const action = isCpiClosed === "1" ? "open" : "close";

    // Only admins can open CPI
    if (action === "open" && !isAdmin) {
      alert("You are not authorized to open CPI.");
      return;
    }

    console.log(`Attempting to ${action} CPI:`, { EntryMasId, FY, SINo, isCpiClosed, isAdmin });

    try {
      const response = await fetch(
        "http://192.168.1.123:8080/name/api/updateCPIclose.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ EntryMasId, FY, SINo, action, isCpiClosed, isAdmin }),
        }
      );

      console.log({ EntryMasId, FY, SINo });
      const result = await response.json();

      if (result.success) {

        // ✅ Show alert first
        const pastTenseMap = {
          close: "closed",
          open: "opened",
        };

        console.log(`CPI successfully ${pastTenseMap[action]}!`);
        alert(`CPI successfully ${pastTenseMap[action]}!`);
        // ✅ Only after alert OK is clicked, update state
        // setIsCpiClosed(true); // mark as closed

        setEntryData((prev) => {
          if (!prev?.success) return prev;

          const updatedData = prev.data.map((rec) =>
            rec.EntryMasId === lastRecord.EntryMasId
              ? { ...rec, isCpiClosed: action === "close" ? "1" : "0" } // set '0' if opened
              : rec
          );
          console.log("Updated entryData:", updatedData); // ✅ log here
          return { ...prev, data: updatedData };
        });
        // ✅ Trigger updatedSizeData to enforce readonly
        // updatedSizeData();
      } else {
        console.error("Failed to close CPI:", result.message);
        alert("Failed to close CPI: " + result.message);
      }
    } catch (err) {
      console.error("Error closing CPI:", err);
      alert("Error closing CPI. Please try again.");
    }
  };
  // ✅ Use isCpiClosed to make form fields readonly
  useEffect(() => {
    // if (!lastRecord || isCloseCpiDisabled) return;

    // setForm((prev) => ({
    //   ...prev,
    //   inscanDate: "",
    //   stitchingDate:"",
    //   fgpsDate:"",
    //   fgpsNumber: "",
    //   fgpsStyle:"",
    //   // Disable fields if CPI closed
    //   __readOnlyFields: isCpiClosed,
    // }));
    whenOneItemName();

  }, [lastRecord]); // runs whenever lastRecord changes

  return (
    <div style={{ padding: "2.5px" }}>
      {loading && <Loader message="Submitting..." />}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", marginRight: "0px" }}
      >
        <div style={{ textAlign: "center", width: "100%" }}>
          <span
            style={{
              fontWeight: "bold",
              fontSize: "18px",
              // fontFamily: "Cambria",
              color: "#1f51afff",
            }}
          >
            Garment Outward
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            // justifyContent: "space-between",
            columnGap: "6px",
            rowGap: "6px",
            fontSize: "13px",
            marginBottom: "6px",
            width: "110%",
            rowGap: "17px",
          }}
        >
          {/* CPI No - Garment Outward */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: "bold" }}>
              CPI No
            </label>
            <input
              name="cpiNumber"
              value={cutPanelForm.cpiNo}
              onChange={handleNumberOnlyInput}
              maxLength={6}
              required
              readOnly
              style={{
                width: "48px",
                marginLeft: "4px",
                backgroundColor: "#e0e0e0",
                outline: "none",
                boxShadow: "none",
                borderColor: "#ccc",
                caretColor: "transparent",
                marginRight: "8px",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <label
              htmlFor="cpiDt"
              style={{ fontSize: "14px", fontWeight: "bold" }}
            >
              CPI Dt.
            </label>
            <input
              // type="date"
              name="cpiDate"
              id="cpiDt"
              value={formatDateToDDMMYYYY(cutPanelForm.cpiDate)}
              //onChange={handleChange}
              style={{
                width: "75px",
                backgroundColor: "#e0e0e0",
                outline: "none",
                boxShadow: "none",
                borderColor: "#ccc",
                caretColor: "transparent",
                marginRight: "8px",
              }}
              required
              readOnly
            />
          </div>

          {/* CPI Type */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: "bold" }}>
              CPI Type
            </label>
            <input
              type="text"
              name="unit"
              id="unit"
              value={cutPanelForm.cpiType || ""} // Replace with the correct value from your form state
              readOnly
              style={{
                width: "43px",
                marginLeft: "4px",
                backgroundColor: "#e0e0e0",
                border: "1px solid #ccc",
                outline: "none",
                boxShadow: "none",
                caretColor: "transparent",
                marginRight: "8px",
              }}
            />
          </div>

          {/* Order No */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: "bold" }}>
              Order No
            </label>
            <input
              name="orderNumber"
              value={cutPanelForm.orderNo}
              onChange={handleNumberOnlyInput}
              maxLength={6}
              required
              readOnly
              style={{
                width: "54px",
                marginLeft: "4px",
                backgroundColor: "#e0e0e0",
                outline: "none",
                boxShadow: "none",
                borderColor: "#ccc",
                caretColor: "transparent",
                marginRight: "8px",
              }}
            />
          </div>

          {/* Color */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              width: "140px",
              marginRight: "8px",
            }}
          >
            <label
              style={{
                whiteSpace: "nowrap",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Color
            </label>
            <div ref={colourRef} style={{ flex: 1 }}>
              <input
                type="text"
                name="color"
                value={cutPanelForm.color}
                readOnly
                style={{
                  width: "109%",
                  backgroundColor: "#e0e0e0",
                  outline: "none",
                  boxShadow: "none",
                  border: "1px solid #ccc",
                  caretColor: "transparent",
                  marginRight: "8px",
                }}
              />
            </div>
          </div>

          {!cutPanelForm.cpiNo ? (
            // BEFORE CPI No is selected → show disabled grey box (readOnly)
            <div>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginLeft: "8px",
                }}
              >
                Item Name
              </label>
              <input
                type="text"
                value=""
                readOnly
                style={{
                  width: "140px",
                  marginLeft: "4px",
                  backgroundColor: "#e0e0e0",
                  border: "1px solid #ccc",
                  outline: "none",
                  boxShadow: "none",
                  caretColor: "transparent",
                }}
              />
            </div>
          ) : (
            // AFTER CPI No is selected → show as readOnly text
            <div>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginLeft: "8px",
                }}
              >
                Item Name
              </label>
              <input
                type="text"
                value={cutPanelForm.ItemName}
                readOnly
                style={{
                  width: "140px",
                  marginLeft: "5px",
                  backgroundColor: "#e0e0e0",
                  border: "1px solid #ccc",
                  outline: "none",
                  boxShadow: "none",
                  caretColor: "transparent",
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: "14px", fontWeight: "bold" }}>
              FGPS Style
            </label>
            <select
              ref={fgpsStyleRef}
              name="fgpsStyle"
              value={form.fgpsStyle}
              disabled={isCpiClosed}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fgpsStyle: e.target.value }))
              }
              className="select-fgps"
              style={{
                width: "67px",
                marginLeft: "4px",
                backgroundColor: isCpiClosed ? "#d3d3d3ff" : "rgb(140, 233, 86)",
                marginRight: "10px",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  fgpsRef.current?.focus(); // Next input
                }
              }}
            >
              {fgpsStyleOptions.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          {/* FGPS No */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: "bold" }}>
              FGPS No
            </label>
            <input
              ref={fgpsRef}
              name="fgpsNumber"
              className="fgps-no"
              value={form.fgpsNumber}
              onChange={handleNumberOnlyInput}
              maxLength={5}
              disabled={isCpiClosed}
              required={!anySizeWIP}
              style={{
                width: "50px",
                marginLeft: "4px",
                backgroundColor: isCpiClosed ? "#d3d3d3ff" : "rgb(140, 233, 86)",
                marginRight: "12px",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleFGPSDateFetchAndDuplicateCheck();
                }
              }}
            // onBlur={(e) => {
            //   e.preventDefault(); // optional
            //   handleFGPSDateFetchAndDuplicateCheck();
            // }}

            />

            {/* FGPS Dt. */}
            <label
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginRight: "4px",
                marginLeft: "7px",
              }}
            >
              FGPS Dt.
            </label>
            <input
              ref={fgpsDateRef}
              type="date"
              name="fgpsDate"
              value={form.fgpsDate}
              onChange={handleInputChange}
              disabled={isCpiClosed}
              className="fgps-date highlight-focus"
              required={!anySizeWIP}
              style={{
                width: "110px",
                padding: "4px",
                fontSize: "13px",
                marginRight: "12px",
                backgroundColor: isCpiClosed ? "#d3d3d3ff" : "rgb(140, 233, 86)",

              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  if (form.fgpsDate) {
                    // ✅ Copy FGPS date to Inscan & Stitching Dates
                    setForm((prev) => ({
                      ...prev,
                      inscanDate: form.fgpsDate,
                      stitchingDate: form.fgpsDate,
                    }));
                  }

                  // 👉 Move focus to Inscan Date
                  inscanRef.current?.focus();
                }
              }}
            />
          </div>

          {/* Stitching Date */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: "bold" }}>
              Stitching Dt.
            </label>
            <input
              ref={stitchingRef}
              type="date"
              name="stitchingDate"
              className="st-date"
              value={form.stitchingDate}
              onChange={handleInputChange}
              disabled={isCpiClosed}
              required={!anySizeWIP}

              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  const allKeys = Object.keys(inputRefs.current);
                  for (let key of allKeys) {
                    const el = inputRefs.current[key];
                    if (el && !el.readOnly) {
                      el.focus();
                      break;
                    }
                  }
                }
              }}
              style={{
                width: "105px",
                marginLeft: "5px",
                backgroundColor: isCpiClosed ? "#d3d3d3ff" : "rgb(140, 233, 86)",
              }}
            />
          </div>

          {/* Inscan Date */}
          <div>
            <label style={{ fontSize: "14px", fontWeight: "bold" }}>
              Inscan Dt.
            </label>
            <input
              ref={inscanRef}
              type="date"
              name="inscanDate"
              className="fgps-date"
              value={form.inscanDate}
              onChange={handleInputChange}
              disabled={isCpiClosed}
              required={!anySizeWIP}
              style={{
                width: "105px",
                marginLeft: "4px",
                backgroundColor: isCpiClosed ? "#d3d3d3ff" : "rgb(140, 233, 86)",
                marginRight: "13px",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  // ✅ Skip Stitching Date — focus first editable field in size table
                  const firstEditableKey = Object.keys(inputRefs.current).find(
                    (key) => {
                      const input = inputRefs.current[key];
                      return input && !input.readOnly && !input.disabled;
                    }
                  );

                  if (firstEditableKey && inputRefs.current[firstEditableKey]) {
                    inputRefs.current[firstEditableKey].focus();
                  } else {
                    console.warn("⚠️ No editable input found in table.");
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Size asdf Breakdown Table */}
        {/* <h3 style={{ fontSize: "15px", marginBottom: "4px" }}>
          Size Breakdown
        </h3> */}
        <div
          style={{
            display: "flex",
            gap: "28px",
            justifyContent: "flex-start",
            // overflowX: "auto",
            // overflowX: "hidden",
            marginBottom: "5px",
          }}
        >
          {
            [
              ["2XS", "XS", "S", "M", "L"],
              ["XL", "2XL", "3XL", "4XL", "TOTAL"],
            ]
              // sizeGroups
              .map((group, idx) => (
                <table
                  key={idx}
                  border="1"
                  cellPadding="4"
                  style={{
                    borderCollapse: "collapse",
                    fontSize: "12px",
                    textAlign: "center",
                    width: "fit-content",
                    minWidth: "300px",
                    marginTop: "17px",
                    // marginLeft: "1px"
                  }}
                >
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: "#f1f1f1",
                    }}
                  >
                    <tr>
                      <th style={{ textAlign: "center" }}>Size</th>
                      {fields.map((field) => (
                        <th key={field} style={{ textAlign: "center" }}>
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {group.map((size) => {
                      const isTotalRow = size === "TOTAL";
                      // const isReadOnlyRow = form.sizeData[size]?.__readOnly;

                      // ✅ Check if EP should be editable for this size
                      const isEPEditable = lineItems.some(
                        (item) =>
                          item.ItemName === cutPanelForm.ItemName &&
                          item.SSize === size
                      );
                      // ✅ Get size data
                      const sizeRow = form.sizeData[size] || {};

                      // ✅ Check if any value in target fields is >= 0
                      const shouldHighlight = highlightFields.some((field) => {
                        const value = parseInt(sizeRow[field]);
                        return !isNaN(value) && value > 0;
                      });

                      return (
                        <tr
                          key={size}
                          style={{
                            backgroundColor:
                              !isTotalRow && highlightedSizesOnClick.includes(size)
                                ? "#d0ebff"
                                : "transparent",
                          }}
                        >
                          <td
                            style={{ fontWeight: isTotalRow ? "bold" : "normal" }}
                          >
                            {/* {size} */}
                            {size}{sizeLabels[size] ? `/${sizeLabels[size]}` : ""}

                          </td>

                          {fields.map((field) => {
                            const inputIndex = `${size}-${field}`;

                            if (isTotalRow) {
                              const total = Object.keys(form.sizeData)
                                .filter((sz) => sz !== "TOTAL")
                                .reduce((sum, sz) => {
                                  const raw = (form.sizeData[sz][field] || "").toString().trim();
                                  let val = parseInt(raw);
                                  if (isNaN(val)) val = 0;

                                  // ✅ Exclude negative WIP
                                  if ((field === "WIP" || field === "Bal Pcs") && val < 0) {
                                    // console.log(`Skipping negative WIP: ${val} for size: ${sz}`);
                                    return sum;
                                  }

                                  return sum + val;
                                }, 0);

                              return (
                                <td
                                  key={field}
                                  style={{
                                    fontWeight: "bold",
                                    backgroundColor: [
                                      "GP",
                                      "EP",
                                      "FRP",
                                      "SWRP",
                                      "MP",
                                      "WIP",
                                    ].includes(field) && total > 0
                                      ? "rgb(102, 96, 189)"
                                      : "#e8e8e8",
                                    color: [
                                      "GP",
                                      "EP",
                                      "FRP",
                                      "SWRP",
                                      "MP",
                                      "WIP",
                                    ].includes(field) && total > 0
                                      ? "white"
                                      : "black",
                                    textAlign: "center",
                                  }}
                                >
                                  {total}
                                </td>
                              );
                            }

                            // ✅ Final read-only logic
                            const isReadOnlyField =
                              field === "WIP" ||
                                field === "Bal Pcs" ||
                                field === "LP" ||
                                field === "EP"
                                ? true
                                : field === "FRP" || "SWRP" ? !form.sizeData[size]?.__Editable : form.sizeData[size]?.__readOnly; //: field === "EP" || "FRP" ? !form.sizeData[size]?.__Editable // Refer UpdateIWPCS initially _epeditable false

                            return (
                              <td key={field}>
                                <input
                                  ref={(el) => {
                                    if (el) inputRefs.current[inputIndex] = el;
                                  }}
                                  type="text"
                                  maxLength={4}
                                  value={form.sizeData[size][field]}
                                  onChange={(e) => {
                                    const onlyDigits = e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 4);
                                    handleSizeChange(size, field, onlyDigits);
                                  }}
                                  onKeyDown={(e) => {
                                    // Block non-numeric input except navigation and control keys
                                    const key = e.key;
                                    // if ( 
                                    //   !e.ctrlKey &&
                                    //   !e.altKey &&
                                    //   !e.metaKey &&
                                    //   !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Enter", "ArrowUp", "ArrowDown"].includes(e.key)
                                    // ) {
                                    //   if (!/^\d$/.test(key)) {
                                    //     e.preventDefault();
                                    //   }
                                    // }

                                    const allKeys = Object.keys(inputRefs.current);
                                    const currentIndex =
                                      allKeys.indexOf(inputIndex);

                                    const [currSize, currField] =
                                      inputIndex.split("-");
                                    const sizeList = Object.keys(
                                      form.sizeData
                                    ).filter((s) => s !== "TOTAL");
                                    const fields = [
                                      "GP",
                                      "EP",
                                      "FRP",
                                      "SWRP",
                                      "MP",
                                    ];

                                    const currentSizeIdx =
                                      sizeList.indexOf(currSize);
                                    const currentFieldIdx =
                                      fields.indexOf(currField);

                                    const isReadOnlyFieldNav = (size, field) => {
                                      // if (field === "EP") {
                                      //   return !lineItems.some(
                                      //     (item) =>
                                      //       item.ItemName === form.ItemName &&
                                      //       item.SSize === size
                                      //   );
                                      // }
                                      return (
                                        field === "WIP" ||
                                        field === "Bal Pcs" ||
                                        form.sizeData[size]?.__readOnly
                                      );
                                    };

                                    const moveFocus = (nextSize, nextField) => {
                                      const key = `${nextSize}-${nextField}`;
                                      const input = inputRefs.current[key];
                                      if (
                                        input
                                        && !isReadOnlyFieldNav(nextSize, nextField)
                                      ) {
                                        input.focus();
                                        return true;
                                      }
                                      return false;
                                    };

                                    if (key === "Enter") {
                                      e.preventDefault();
                                      let foundNext = false;
                                      let nextIndex = currentIndex;

                                      while (++nextIndex < allKeys.length) {
                                        const nextKey = allKeys[nextIndex];
                                        const [nextSize, nextField] =
                                          nextKey.split("-");
                                        if (
                                          nextField === "GP" &&
                                          !isReadOnlyFieldNav(nextSize, nextField)
                                        ) {
                                          inputRefs.current[nextKey]?.focus();
                                          foundNext = true;
                                          break;
                                        }
                                      }

                                      if (!foundNext && submitButtonRef.current) {
                                        submitButtonRef.current.focus();
                                      }
                                    }

                                    if (key === "ArrowRight") {
                                      let nextIdx = currentFieldIdx;
                                      while (++nextIdx < fields.length) {
                                        const nextField = fields[nextIdx];
                                        if (moveFocus(currSize, nextField)) {
                                          e.preventDefault();
                                          break;
                                        }
                                      }
                                    }

                                    if (key === "ArrowLeft") {
                                      let prevIdx = currentFieldIdx;
                                      while (--prevIdx >= 0) {
                                        const prevField = fields[prevIdx];
                                        if (moveFocus(currSize, prevField)) {
                                          e.preventDefault();
                                          break;
                                        }
                                      }
                                    }

                                    if (
                                      key === "ArrowDown" &&
                                      currentSizeIdx < sizeList.length - 1
                                    ) {
                                      const nextSize = sizeList[currentSizeIdx + 1];
                                      if (moveFocus(nextSize, currField))
                                        e.preventDefault();
                                    }

                                    if (key === "ArrowUp" && currentSizeIdx > 0) {
                                      const nextSize = sizeList[currentSizeIdx - 1];
                                      if (moveFocus(nextSize, currField))
                                        e.preventDefault();
                                    }
                                    // Alt + S (case insensitive)
                                    if (e.altKey && e.key.toLowerCase() === "s") {
                                      e.preventDefault(); // prevent default browser behavior
                                      if (submitButtonRef.current) {
                                        submitButtonRef.current.focus(); // set focus
                                      }
                                    }
                                    if (e.key.toLowerCase() === "*") {
                                      e.preventDefault(); // prevent default browser behavior
                                      if (submitButtonRef.current) {
                                        submitButtonRef.current.focus(); // set focus
                                      }
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // const inputVal = e.target.value.replace(/\D/g, "").slice(0, 4);

                                    // // 1. Call handleSizeChange onBlur
                                    // handleSizeChange(size, field, inputVal);

                                    const triggerFields = [
                                      "GP",
                                      "FRP",
                                      "SWRP",
                                      "MP",
                                    ];
                                    if (
                                      triggerFields.includes(field) &&
                                      updateLineItemOWQty
                                    ) {
                                      const labelKey = Object.keys(sizeLabels).find(
                                        key => sizeLabels[key] === size // keep string compare
                                      ) || size;

                                      const data = form.sizeData[labelKey] || {};
                                      // console.log("size:", size);
                                      // console.log("labelKey:", labelKey);
                                      // console.log("sizeData keys:", Object.keys(form.sizeData));
                                      // console.log("data object:", data);
                                      // console.log("GP value:", data.GP);
                                      const isNumericHere = /^\d+$/.test(String(sizeLabels[size]).trim());

                                      // if (isNumericHere) {
                                      //   setIsNumeric(true);
                                      // }
                                      updateLineItemOWQty(
                                        size, // Pass the key
                                        cutPanelForm.ItemName,
                                        parseInt(data.GP) || 0,
                                        parseInt(data.FRP) || 0,
                                        parseInt(data.SWRP) || 0,
                                        parseInt(data.MP) || 0,
                                        isNumericHere ? sizeLabels[size] : null
                                      );
                                    }
                                  }}
                                  readOnly={isReadOnlyField}
                                  tabIndex={isReadOnlyField ? -1 : 0}
                                  title={
                                    field === "WIP" || field === "Bal Pcs"
                                      ? "Auto-filled field"
                                      : ""
                                  }
                                  style={{
                                    width: "35px",
                                    height: "1.25rem",
                                    padding: "2px",
                                    fontSize: "11px",
                                    textAlign: "center",
                                    backgroundColor: isReadOnlyField
                                      ? "#e0e0e0"
                                      : "rgb(179, 219, 179)",
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ))}
        </div>

        {/* Buttons */}
        <div>
          <button
            ref={submitButtonRef}
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? editable
                ? "Updating..."
                : "Submitting..."
              : editable
                ? "Update"
                : "Submit"}
            <b>
              <u>*</u>
            </b>
          </button>


          <button
            type="button"
            className="clear-button"
            onClick={(e) => {
              handleClear(); // your existing logic
              e.currentTarget.blur(); // remove focus
            }}

            style={{
              // padding: "10px 14px",
              // fontSize: "13px",
              backgroundColor: "#777",
              color: "#fff",
              // border: "none",
              // borderRadius: "4px",
              // cursor: "pointer",
              // marginLeft: "2px",
            }}
          >
            Clear
          </button>
          {/* <label htmlFor="DPRNo">DPR No :</label> */}
          {/* {dprNo && ( */}
          {/* <div style={{ display: "flex" }}> */}
          {/* <div > */}
          <label style={{ fontWeight: "bold", fontSize: "15px", marginTop: "1rem" }} htmlFor="dprNo"> DPR No: <span style={{ color: "#0033cc", fontSize: "20px" }}>{dprNo}</span></label>
          {/* </div> */}
          {/* <div> */}
          <label
            style={{ fontWeight: "bold", fontSize: "15px", marginTop: "1rem", marginLeft: "1rem" }}
            htmlFor="dprDate"
          >
            DPR Dt:
            <span style={{ color: "#0033cc", fontSize: "20px", marginLeft: "0.5rem" }}>
              {dprDate && formatDprDate(dprDate)}
            </span>
          </label>
          <label style={{ fontWeight: "bold", fontSize: "15px", marginTop: "1rem", marginLeft: "1rem" }} htmlFor="dprNo"> DPR By: <span style={{ color: "#0033cc", fontSize: "20px" }}>{dprEntryBy}</span></label>

          {/* </div> */}
          {/* </div> */}

          {/* )} */}


          {/* <button
            style={{
              // display: "flex",
              alignItems: "center",
              padding: "6px 12px",
              backgroundColor: "#1D6F42", // Excel green
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
            onClick={handleExcelExport}
          >
            📊 Excel
          </button> */}

          {/* <button
            type="button"
            className="close-fgps-button"
            // onClick={handleCloseFGPS}
            style={{
              padding: "10px 14px",
              fontSize: "13px",
              backgroundColor: "#dc3545", // Red
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginLeft: "197px",
            }}
          >
            Close FGPS
          </button> */}
          {/* <button type="button" className={`close-cpi-btn ${lastRecord?.isCpiClosed === "1" ? "red" : ""}`}
            onClick={() =>
              closeCPI({
                EntryMasId: lastRecord?.EntryMasId,
                FY: selectedYear,
                SINo: lastRecord?.SINo,
              })
            } disabled={isCloseCpiDisabled}
          >  {lastRecord?.isCpiClosed === "1" ? "CPI Closed" : "Close CPI"}
          </button> */}
          {/* <div className="cpi-buttons"> */}
          {/* Close CPI button */}
          <button
            type="button"
            className={`close-cpi-btn ${lastRecord?.isCpiClosed === "1" ? "red" : ""}`}
            onClick={() =>
              OpenOrcloseCpi({
                EntryMasId: lastRecord?.EntryMasId,
                FY: selectedYear,
                SINo: lastRecord?.SINo,
                isCpiClosed: lastRecord?.isCpiClosed,
                isAdmin: userInfo.isAdmin,
              })
            }
            disabled={isCloseCpiDisabled}
          >
            {lastRecord?.isCpiClosed === "1" ? "CPI Closed" : "Close CPI"}
          </button>

          {/* Open CPI button – only enabled for admins */}
          {isCpiClosed && userInfo.isAdmin && (<button
            type="button"
            className="close-cpi-btn"
            style={{ marginRight: '5px' }}
            onClick={() =>
              OpenOrcloseCpi({
                EntryMasId: lastRecord?.EntryMasId,
                FY: selectedYear,
                SINo: lastRecord?.SINo,
                isCpiClosed: lastRecord?.isCpiClosed,
                isAdmin: userInfo.isAdmin,
              })
            }
            disabled={!userInfo.isAdmin}
          >
            Open CPI
          </button>)}
          {/* </div> */}


        </div>

      </form>
      {showConfirmation && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            border: "1px solid #ccc",
            padding: "18px 24px",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            zIndex: 9999,
            textAlign: "center",
            minWidth: "320px",
          }}
        >
          <p
            style={{
              fontSize: "18px",
              fontWeight: "italic",
              marginBottom: "14px",
            }}
          >
            <br />
            Do you want to close FGPS?
          </p>

          <div
            style={{ display: "flex", justifyContent: "center", gap: "20px" }}
          >
            <button
              ref={noButtonRef}
              onClick={() => setShowConfirmation(false)}
              style={{
                padding: "6px 16px",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              No
            </button>
            <button
              ref={yesButtonRef}
              onClick={() => {
                setShowConfirmation(false);
                handleCloseFGPS(); // you define this
              }}
              style={{
                padding: "6px 16px",
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Yes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// import React, { useState } from 'react';
function FilterComponent({ cutPanelForm, selectedYear }) {
  const { userInfo } = useUser();

  const [filters, setFilters] = useState({
    cpiNo: "",
    cpiFrom: "",
    cpiTo: "",
    dprFrom: "",
    dprTo: "",
    fgpsDateFrom: "",
    fgpsDateTo: "",
    cpiDateFrom: "",
    cpiDateTo: "",
    dprDateFrom: "",
    dprDateTo: "",
    fgpsNo: "",
    fgpsType: "",
    fgpsFrom: "",
    fgpsTo: "",
    itemName: "",
    scanDateFrom: "",
    scanDateTo: "",
    stitchingDateFrom: "",
    stitchingDateTo: "",
    reportType: "Detail",
    InputLocationID: userInfo.LocationID,
  });
  const cpiToRef = useRef(null);
  const dprToRef = useRef(null);
  const fgpsDateToRef = useRef(null);
  const cpiDateToRef = useRef(null);
  const dprDateToRef = useRef(null);
  const fgpsFromRefs = useRef({});
  const fgpsToRefs = useRef({});
  const scanDateToRef = useRef({});
  const stitchingDateToRef = useRef({});
  const applyButtonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalData, setTotalData] = useState(0);           // ✅ total rows to process

  const [reportInputsEditable, setReportInputsEditable] = useState(false);



  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleInputChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  useEffect(() => {
    console.log("Updated reportType:", filters.reportType);
  }, [filters.reportType]);


  const handleClearFilters = () => {
    setFilters({
      cpiNo: "",
      cpiFrom: "",
      cpiTo: "",
      dprFrom: "",
      dprTo: "",
      fgpsDateFrom: "",
      fgpsDateTo: "",
      cpiDateFrom: "",
      cpiDateTo: "",
      dprDateFrom: "",
      dprDateTo: "",
      fgpsNo: "",
      fgpsType: "",
      fgpsFrom: "",
      fgpsTo: "",
      itemName: "",
      scanDateFrom: "",
      scanDateTo: "",
      stitchingDateFrom: "",
      stitchingDateTo: "",
      reportType: "",
      InputLocationID: "",
    });
  };
  // const downloadReport = async () => {
  //   const params = new URLSearchParams({
  //     fy: selectedYear || "",
  //     locationID: userInfo?.LocationID,
  //     isWIP: filters.reportType === "WIP",
  //     isOnlyWIP: filters.reportType === "OnlyWIP",
  //     isOnlyLP: filters.reportType === "OnlyLP",
  //   });
  //   if (filters.cpiFrom) params.append("cpiFrom", filters.cpiFrom);
  //   if (filters.cpiTo) params.append("cpiTo", filters.cpiTo);
  //   if (filters.itemName) params.append("itemName", filters.itemName);

  //   window.open(`http://192.168.1.123:8080/name/api/reportExcel.php?${params.toString()}`, "_blank");

  //   // window.open(url, "_blank");
  // };


  const handleApplyFilters = async () => {
    setLoading(true);
    setTotalData(0);
    setProcessedCount(0);
    setProgress(0);
    try {
      console.log("Applied filters:", filters);

      const payload = {
        fy: selectedYear || "" // ✅ Priority: cutPanelForm.fy → fyRef → empty
      }; if (filters.cpiFrom) payload.cpiFrom = filters.cpiFrom;
      if (filters.cpiTo) payload.cpiTo = filters.cpiTo;
      if (filters.dprFrom) payload.dprFrom = filters.dprFrom;
      if (filters.dprTo) payload.dprTo = filters.dprTo;
      if (filters.dprDateFrom) payload.dprDateFrom = filters.dprDateFrom;
      if (filters.dprDateTo) payload.dprDateTo = filters.dprDateTo;
      if (filters.InputLocationID) payload.LocationID = filters.InputLocationID;
      if (filters.fgpsDateFrom) payload.fgpsDateFrom = filters.fgpsDateFrom;
      if (filters.fgpsDateTo) payload.fgpsDateTo = filters.fgpsDateTo;
      if (filters.cpiDateFrom) payload.cpiDateFrom = filters.cpiDateFrom;
      if (filters.cpiDateTo) payload.cpiDateTo = filters.cpiDateTo;
      if (filters.scanDateFrom) payload.inscanDateFrom = filters.scanDateFrom;
      if (filters.scanDateTo) payload.inscanDateTo = filters.scanDateTo;
      if (filters.stitchingDateFrom) payload.stitchingDateFrom = filters.stitchingDateFrom;
      if (filters.stitchingDateTo) payload.stitchingDateTo = filters.stitchingDateTo;
      if (filters.itemName) payload.itemName = filters.itemName;
      const countResp = await fetch("http://192.168.1.123:8080/name/api/reportExportCounts.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const countResult = await countResp.json();
      if (countResult.success) {
        let totalEntries = 0;

        if (filters.reportType === "Detail") {
          // For Detail report, include all: head + line + entry
          totalEntries =
            (countResult.counts.head || 0) +
            (countResult.counts.entry || 0);
        } else {
          // For Summary or other types, just head
          totalEntries = countResult.counts.head || 0;
        }

        setTotalData(totalEntries);
        setProcessedCount(0);
        setProgress(0);



        console.log("Head count:", countResult.counts.head);
        console.log("Line count:", countResult.counts.line);
        console.log("EntryMas count:", totalEntries);

        // 🔹 Step 2: Smooth simulated progress
        let processed = 0;

        // ⏳ Estimate time (in seconds) based on totalEntries
        const baseTime = 10; // 10s minimum
        const extraTime = Math.ceil(totalEntries / 3000) * 10;
        const estimatedTime = extraTime; // e.g., 2267 rows → 10s, 22494 rows → 80s

        // 🔹 Interval update frequency
        const updateInterval = 200; // ms
        const totalSteps = Math.floor((estimatedTime * 1000) / updateInterval);
        let stepCount = 0;

        const interval = setInterval(() => {
          stepCount++;
          const progress = Math.min(100, Math.floor((stepCount / totalSteps) * 100));

          // Simulate processed entries proportional to progress
          processed = Math.floor((progress / 100) * totalEntries);

          setProcessedCount(processed);
          setProgress(progress);

          if (progress >= 100) {
            clearInterval(interval);
          }
        }, updateInterval);

        // 🔹 Fake progress (0 → 95%, then wait for API to complete)
        let fakeProgress = 0;
        const fakeInterval = setInterval(() => {
          // Smooth linear growth tied to estimated time
          fakeProgress += 100 / totalSteps;
          if (fakeProgress >= 95) fakeProgress = 95; // cap before API completes
          setProgress(Math.round(fakeProgress));
        }, updateInterval);



        // 🔹 Fake progress (0 → 85%)
        // let fakeProgress = 0;
        // const fakeInterval = setInterval(() => {
        //   fakeProgress += Math.random() * 2; // smooth increment
        //   if (fakeProgress > 85) fakeProgress = 95; // stop at 85%
        //   setProgress(Math.round(fakeProgress));
        // }, 200);

        // ⏳ Kick off export
        const response = await fetch("http://192.168.1.123:8080/name/api/reportExport.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // 🔄 In parallel, listen for live progress (optional)
        // const eventSource = new EventSource("http://192.168.1.123:8080/name/api/reportExport.php");
        // eventSource.onmessage = (event) => {
        //   const msg = JSON.parse(event.data);

        //   if (msg.type === "progress") {
        //     setTotalData(msg.total);
        //     setProcessedCount(msg.processed);
        //     setProgress(msg.progress);
        //   }

        //   if (msg.type === "complete") {
        //     eventSource.close();
        //   }
        // };

        // 2️⃣ Convert payload → query string for SSE
        // const query = new URLSearchParams(payload).toString();
        // const sseUrl = `http://192.168.1.123:8080/name/api/reportExport.php?${query}`;

        // // 3️⃣ Open SSE connection with filters applied
        // const eventSource = new EventSource(sseUrl);
        // let result = null;

        // eventSource.onmessage = async (event) => {
        //   result = JSON.parse(event.data);

        //   if (result.type === "progress") {
        //     // ⏳ Update loader UI
        //     setTotalData(result.total);
        //     setProcessedCount(result.processed);
        //     setProgress(result.progress);
        //   }

        //   if (result.type === "complete") {
        //     eventSource.close(); // ✅ close connection

        // ✅ Old final response still works, untouched
        const result = await response.json();
        // 🔹 Stop fake progress
        clearInterval(fakeInterval);
        if (result.success) {
          let finalProcessed = 0;

          if (filters.reportType === "Detail") {
            // Detail report: entry data + head rows
            finalProcessed = (result.data?.length || 0) + (result.head?.length || 0);
          } else {
            // Summary or other types: only head rows
            finalProcessed = result.head?.length || 0;
          }

          setProcessedCount(finalProcessed); // mark all processed
          setProgress(100);                           // complete
          console.log("Export data ready:", result.data.length);
        } else {
          alert("❌ Export failed or no data found.");
        }



        if (!result.success || !result.data?.length) {
          alert("❌ No data found or export failed.");
          return;
        }
        // ✅ Optional: delay to let progress bar finish smoothly
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 🟢 Step 1: Use predefined size list from 2XS to 4XL
        const sizes = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

        const sizeFields = ["IW", "OW", "GP", "EP", "FRP", "SWRP", "MP", "WIP", "LP"];
        const isDetail = filters.reportType === "Detail";
        const isWIP = filters.reportType === "WIP";
        const isOnlyWIP = filters.reportType === "OnlyWIP";
        const isOnlyLP = filters.reportType === "OnlyLP";
        const fieldsToShow = isOnlyWIP ? ["WIP"] : isOnlyLP ? ["LP"] : sizeFields;

        // 🟢 Step 2: Create workbook and worksheet
        let sheetName = "DPR_Detail";

        if (isOnlyWIP) {
          sheetName = "WIP_Summary";
        } else if (isOnlyLP) {
          sheetName = "LP_Summary";
        } else if (isWIP) {
          sheetName = "DPR_Abstract";
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);
        // ✅ Set default row height
        const IssueheaderRowNumbers = new Set();


        worksheet.views = [{ state: "frozen", xSplit: 14, ySplit: 2 }];

        const firstRow = [
          "",
          "",
          "",
          isWIP || isOnlyWIP || isOnlyLP ? "" : "CPI Dt",
          "",
          "",
          "Garment Out Ward",
          "",
          "",
          "",
          "",
          "",
          // ...(isOnlyWIP || isOnlyLP
          //   ? [{ label: `${isOnlyWIP ? "WIP" : "LP"} Size Details`, colSpan: sizes.length }]:
          ...Array((isOnlyWIP || isOnlyLP) ? sizes.length : sizes.length * sizeFields.length).fill(""),
        ];

        // const secondRow = [
        //   "CPI#",
        //   "FGPS",
        //   "Ord.No",
        //   "In Scan Dt.",
        //   "Stitching Dt.",
        //   "Item Name",
        //   "IW",
        //   "OW",
        //   "GP",
        //   "EP",
        //   "FRP",
        //   "SWRP",
        //   "MP",
        //   "WIP",
        //   ...sizes.flatMap(() => sizeFields),
        // ];

        // Compute the dynamic tail of the row
        const sizeTailOrFields =
          isOnlyWIP || isOnlyLP
            ? sizes // just once per size
            : sizes.flatMap(() => fieldsToShow); // full matrix

        console.log(sizeTailOrFields);

        // Now build the full secondRow
        const secondRow = [
          "CPI#",
          "FGPS", //...(isOnlyWIP || isOnlyLP ? [] : [])
          "Ord.No",
          isWIP || isOnlyWIP || isOnlyLP ? "CPI Dt" : "In Scan Dt.",
          "Item Name",
          "Color", //...(isOnlyWIP || isOnlyLP ? [] : [])
          "IW", "OW", "GP", "EP", "FRP", "SWRP", "MP", "WIP", //...(isOnlyLP ? [] : [])
          ...sizeTailOrFields,
        ];
        worksheet.addRow(firstRow);
        worksheet.addRow(secondRow);

        // 🟢 Step 3: Merge headers and apply styling
        // Merge columns 7–12 as "Garment Outward"
        worksheet.mergeCells(1, 7, 1, 14);
        worksheet.getCell("G1").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F7C7AC" }, // ARGB for #50B2CA
        };

        // 🟢 Step 3: Merge headers and apply styling
        // let col = 15;
        // sizes.forEach(() => {
        //   worksheet.mergeCells(1, col, 1, col + sizeFields.length - 1);
        //   col += sizeFields.length;
        // });
        // const fieldsToShow = isOnlyWIP ? ["WIP"] : sizeFields;

        // 🟢 Step 2: Merge headers and set labels
        let col = 15;

        if (isOnlyWIP || isOnlyLP) {
          // 🟢 Merge once for the label
          const startCol = col;
          const endCol = col + sizes.length - 1;

          worksheet.mergeCells(1, startCol, 1, endCol);
          worksheet.getCell(1, startCol).value = isOnlyWIP ? "WIP Size Details" : "LP Size Details";
          worksheet.getCell(1, startCol).alignment = { horizontal: "center", vertical: "middle" };

          // 🟢 Fill second row with sizes
          sizes.forEach((size, i) => {
            worksheet.getCell(2, startCol + i).value = size;
            worksheet.getCell(2, startCol + i).alignment = { horizontal: "center" };
          });

          col = endCol + 1;
        } else {
          // 🟢 Multi-field header logic
          sizes.forEach((size) => {
            const startCol = col;
            const endCol = col + sizeFields.length - 1;

            worksheet.mergeCells(1, startCol, 1, endCol);
            worksheet.getCell(1, startCol).value = size;
            worksheet.getCell(1, startCol).alignment = { horizontal: "center", vertical: "middle" };

            sizeFields.forEach((field, i) => {
              worksheet.getCell(2, col + i).value = field;
              worksheet.getCell(2, col + i).alignment = { horizontal: "center" };
            });

            col += sizeFields.length;
          });
        }



        [1, 2].forEach((rowNumber) => {
          const row = worksheet.getRow(rowNumber);
          row.height = 15;
          row.eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { wrapText: false, horizontal: "center", vertical: "middle" };
          });
        });

        // ✅ Set headerRow1 font: all black, except D1 (CPI Dt) should be pink
        const headerRow1 = worksheet.getRow(1);
        headerRow1.eachCell((cell, colNumber) => {
          const isCpiDt = colNumber === 4; // D1 = 4th column
          cell.font = {
            color: { argb: isCpiDt ? "FFD36BA4" : "FF000000" }, // pink or black
            bold: true,
            size: isCpiDt ? 11 : 11, // optional: make CPI Dt slightly larger
          };
        });
        const headerRow2 = worksheet.getRow(2);
        headerRow2.eachCell((cell) => {
          cell.font = {
            color: { argb: "FF0C3691" }, // Deep blue font (rgb(12, 54, 145))
            bold: true,
          };
        });
        const entryMap = {};
        result.data.forEach((entry) => {
          const key = `${entry.SINo}__${entry.ItemName}`;
          if (!entryMap[key]) {
            entryMap[key] = [];
          }
          entryMap[key].push(entry);
        });
        // console.log("Raw Data:", result.data);
        // console.log("Entry Map:", entryMap);

        // Object.entries(entryMap).forEach(([key, entries]) => {
        //   console.log(`\n🔑 Key: ${key}`);
        //   entries.forEach(e => console.log("   →", e));
        // });

        const lineMap = {};
        result.lines.forEach((line) => {
          const key = `${line.SINo}__${line.ItemName}`;
          if (!lineMap[key]) {
            lineMap[key] = [];
          }
          lineMap[key].push(line);
        });

        console.log('Line Maps : ', lineMap);

        // After fetching the result
        // const totalRows = result.head.length; // total rows to process
        // setTotalData(totalRows);
        // setProcessedCount(0);
        // setProgress(0);

        // let localCount = 0; // local counter for progress

        result.head.forEach((headRow) => {
          const sino = headRow.SINo;

          // First try to get itemNames from result.data
          // let itemNames = [...new Set(
          //   result.data
          //     .filter((d) => d.SINo === sino)
          //     .map((d) => d.ItemName)
          //     .filter(Boolean) // remove null/undefined
          // )];

          // const itemNames = [...new Set([
          //   // From result.data (no IssueQty filter)
          //   ...result.data
          //     .filter((d) => d.SINo === sino)
          //     .map((d) => d.ItemName)
          //     .filter(Boolean),

          //   // From result.lines (only IssueQty > 0)
          //   ...result.lines
          //     .filter((l) => l.SINo === sino && l.IssueQty > 0)
          //     .map((l) => l.ItemName)
          //     .filter(Boolean)
          // ])];

          // console.log(`SINo: ${sino}`, "ItemNames:", itemNames);

          //current working for entire OW PCS
          let itemNames;

          if (isWIP || isOnlyWIP || isOnlyLP) {
            // ✅ Only from lines
            let lineItemNames = [];
            for (const l of result.lines) {
              if (l.SINo === sino && l.IssueQty > 0 && l.ItemName) {
                lineItemNames.push(l.ItemName);
              }
            }
            itemNames = [...new Set(lineItemNames)];
          } else {
            // ✅ Only from data
            let dataItemNames = [];
            for (const d of result.data) {
              if (d.SINo === sino && d.ItemName) {
                dataItemNames.push(d.ItemName);
              }
            }
            itemNames = [...new Set(dataItemNames)];
          }

          console.log(`SINo: ${sino}`, "ItemNames (final):", itemNames);

          // let dataItemNames = result.data
          //   .filter((d) => d.SINo === sino)
          //   .map((d) => d.ItemName)
          //   .filter(Boolean);

          // console.log(`SINo: ${sino}`, "dataItemNames:", dataItemNames);

          // let itemNames =
          //   dataItemNames.length > 0
          //     ? [...new Set(dataItemNames)]
          //     : [...new Set(
          //       result.lines
          //         .filter((l) => l.SINo === sino && l.IssueQty > 0)
          //         .map((l) => l.ItemName)
          //         .filter(Boolean)
          //     )];

          // console.log(`SINo: ${sino}`, "ItemNames (final):", itemNames);




          // const itemNames = [
          //   ...new Set([
          //     // ...result.head
          //     //   .filter(h => h.SINo === sino)
          //     //   .map(h => h.ItemName),
          //     ...result.lines
          //       .filter(l => l.SINo === sino)
          //       .map(l => l.ItemName)
          //   ].filter(Boolean)) // remove null/undefined
          // ];
          itemNames.forEach((itemName) => {
            const key = `${sino}__${itemName}`;
            // const records = entryMap[key] || [];

            // if (!records.length) return; // Skip if no entryMas records
            const entryRecords = entryMap[key] || [];
            const lineRecords = lineMap[key] || [];

            let records = [];

            if (isWIP || isOnlyWIP || isOnlyLP) {
              // ✅ Merge both
              records = [...entryRecords, ...lineRecords];
            } else {
              // ✅ Only entry records
              records = entryRecords;
            }

            if (!records.length) return; // Skip if no records at all

            console.log(`SINo: ${sino}, Item: ${itemName}`, records);


            const sizeMapForHeader = {};

            // 1️⃣ Add IW (IssueQty) from lineMap
            (lineMap[key] || []).forEach((line, idx) => {
              // const sizeCode = line.SSize?.toUpperCase();
              // const sizeCode = String(line.SSize || "").toUpperCase().trim(); // force to string
              // const qty = parseInt(line.IssueQty) || 0;
              const rawSize = line.SSize;
              const qty = parseInt(line.IssueQty) || 0;

              // Normalize to string
              let sizeCode = String(rawSize || "").trim().toUpperCase();

              // If numeric → reverse lookup from sizeLabels
              if (/^\d+$/.test(sizeCode)) {
                sizeCode =
                  Object.keys(sizeLabels).find((label) => sizeLabels[label] === sizeCode) ||
                  sizeCode; // fallback: keep as number string if no match
              }

              console.log(
                `[Line ${idx}] raw: ${rawSize} (${typeof rawSize}) | normalized: ${sizeCode} | qty: ${qty}`
              );
              if (!sizeMapForHeader[sizeCode]) {
                sizeMapForHeader[sizeCode] = { IW: 0, OW: 0, GP: 0, EP: 0, FRP: 0, SWRP: 0, MP: 0, WIP: 0, LP: 0 };
              }
              sizeMapForHeader[sizeCode].IW += qty;
            });

            // 2️⃣ Add other fields from entry.sizes
            (records || []).forEach((entry) => {
              (entry.sizes || []).forEach((size) => {
                const sizeCode = size.SizeCode?.toUpperCase();
                if (!sizeMapForHeader[sizeCode]) {
                  sizeMapForHeader[sizeCode] = { IW: 0, OW: 0, GP: 0, EP: 0, FRP: 0, SWRP: 0, MP: 0, WIP: 0, LP: 0 };
                }
                sizeMapForHeader[sizeCode].GP += parseInt(size.GP) || 0;
                sizeMapForHeader[sizeCode].EP += parseInt(size.EP) || 0;
                sizeMapForHeader[sizeCode].FRP += parseInt(size.FRP) || 0;
                sizeMapForHeader[sizeCode].SWRP += parseInt(size.SWRP) || 0;
                sizeMapForHeader[sizeCode].MP += parseInt(size.MP) || 0;
                sizeMapForHeader[sizeCode].WIP += parseInt(size.WIP) || 0;
                sizeMapForHeader[sizeCode].LP += parseInt(size.LP) || 0;
              });
            });

            // 3️⃣ Calculate WIP
            Object.values(sizeMapForHeader).forEach((size) => {
              const iw = size.IW || 0;
              const gp = size.GP || 0;
              const ep = size.EP || 0;
              const frp = size.FRP || 0;
              const swrp = size.SWRP || 0;
              const mp = size.MP || 0;

              size.WIP = iw - (gp + frp + swrp + mp);
              size.OW = (gp + frp + swrp + mp); //+ ep 
            });


            // const headSizeData = sizes.flatMap((sz) => {
            //   const s = sizeMapForHeader[sz] || {};
            //   return ["IW", "OW", "GP", "EP", "FRP", "SWRP", "MP", "WIP", "LP"].map((field) => {
            //     const val = s[field] ?? "";
            //     if (field === "WIP") {
            //       return val === 0 ? 0 : val;
            //     } else {
            //       return val === 0 ? "" : val;
            //     }
            //   });
            // });
            const headSizeData = sizes.flatMap((sz) => {
              const s = sizeMapForHeader[sz] || {};

              const fields =
                filters.reportType === "OnlyWIP"
                  ? ["WIP"]
                  : filters.reportType === "OnlyLP"
                    ? ["LP"]
                    : ["IW", "OW", "GP", "EP", "FRP", "SWRP", "MP", "WIP", "LP"];

              return fields.map((field) => {
                const val = s[field] ?? "";
                if (field === "WIP") {
                  return val === 0 ? 0 : val; // Always show 0 for WIP
                }
                return val === 0 ? "" : val;
              });
            });




            let totalGPsum = records.reduce((sum, r) => sum + (parseInt(r.Total_GP) || 0), 0);
            const totalEPsum = records.reduce((sum, r) => sum + (parseInt(r.Total_EP) || 0), 0);
            const totalFRPsum = records.reduce((sum, r) => sum + (parseInt(r.Total_FRP) || 0), 0);
            const totalSWRPsum = records.reduce((sum, r) => sum + (parseInt(r.Total_SWRP) || 0), 0);
            const totalMPsum = records.reduce((sum, r) => sum + (parseInt(r.Total_MP) || 0), 0);
            // ✅ Adjustment: if EP > 0, add negative WIP into totalGPsum
            // if (totalEPsum > 0) {
            //   Object.values(sizeMapForHeader).forEach((size) => {
            //     if (size.WIP < 0) {
            //       totalGPsum += size.WIP; // add the negative WIP
            //     }
            //   });
            // }
            // ✅ Adjustment: Always add negative WIP into totalGPsum
            Object.values(sizeMapForHeader).forEach((size) => {
              if (size.WIP < 0) {
                totalGPsum += size.WIP; // add the negative WIP
              }
            });

            // Final balance = TotalIssueQty - (GP + FRP + SWRP + MP)
            const finalBalance =
              (parseInt(headRow.TotalIssueQty) || 0) -
              (totalGPsum + totalFRPsum + totalSWRPsum + totalMPsum); //totalEPSum removed 
            const totalOWSum = (totalGPsum + totalEPsum + totalFRPsum + totalSWRPsum + totalMPsum); //+ totalEPsum
            // const itemNameForWIPRecord = key.split("__")[1]; // Extract itemName from key
            const isCpiClosed = headRow.isCpiClosed === "1";

            if (!(isOnlyWIP && isCpiClosed)) {

              // ✅ Add Head Row
              const headDisplayRow = [
                parseInt(sino),               // Column A (1): SINo
                "",                 // Column B (2)
                parseInt(headRow.OrderNo),
                formatDateToDDMMYYYY(headRow.SIDate),  // Column D (4): SIDate
                itemName, headRow.Color, // ⬅️ Add itemName ONLY if reportType is WIP
                parseInt(headRow.TotalIssueQty) ?? " ",
                totalOWSum,
                totalGPsum,
                totalEPsum,
                totalFRPsum,
                totalSWRPsum,
                totalMPsum,
                finalBalance,
                ...headSizeData                    // From sizes (starts at column 13)
              ];
              const row = worksheet.addRow(headDisplayRow);
              IssueheaderRowNumbers.add(row.number); // ✅ Track this row number
              const wipIndexInSizeForWIPReport = sizeFields.indexOf("WIP");
              // const headRow = worksheet.addRow(headDisplayRow);
              // if (isWIP || isOnlyWIP || isOnlyLP) {
              //   const sizeColors = [
              //     "94DCF8", // 2XS
              //     "DAF2D0", // XS
              //     "94DCF8", // S
              //     "FFCCCCCC", // M
              //     "94DCF8", // L
              //     "FADBD8", // XL
              //     "FFCCCCCC", // 2XL
              //     "DAF2D0", // 3XL
              //     "F9CB9C",  // 4XL
              //   ];

              //   const finalBalanceIndex = 14; // 1-based column number
              //   const startCol = 15; // First size column
              //   const columnsPerSize = sizeFields.length;

              //   // sizes.forEach((size, sizeIndex) => {
              //   //   const color = sizeColors[sizeIndex];
              //   const sizeIndexesToColor = isOnlyWIP || isOnlyLP ? [0] : sizes.map((_, i) => i); // Only 2XS if isOnlyWIP

              //   sizeIndexesToColor.forEach((sizeIndex) => {
              //     const color = sizeColors[sizeIndex];
              //     const baseCol = startCol + sizeIndex * columnsPerSize;

              //     for (let offset = 0; offset < columnsPerSize; offset++) {
              //       const colIndex = baseCol + offset;

              //       worksheet.getColumn(colIndex).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
              //         const isWIPColumn = offset === wipIndexInSizeForWIPReport;
              //         // const isHeaderRow = IssueheaderRowNumbers.has(rowNumber);

              //         if (isWIPColumn && !isOnlyWIP && !isOnlyLP) {
              //           // ✅ Yellow for WIP column in header row
              //           cell.fill = {
              //             type: "pattern",
              //             pattern: "solid",
              //             fgColor: { argb: "FFFFFF00" },
              //           };
              //           cell.font = {
              //             bold: true,
              //             color: { argb: "FF0D5EF7" }, // Blue
              //           };
              //         } else {
              //           // 🎨 Normal size cell color
              //           cell.fill = {
              //             type: "pattern",
              //             pattern: "solid",
              //             fgColor: { argb: color },
              //           };
              //         }

              //       });
              //     }
              //   });
              //   // ✅ Apply Yellow fill to Final Balance column (Column 14) in header rows
              //   const finalBalanceColumn = worksheet.getColumn(finalBalanceIndex);

              //   // ✅ Fill the actual header cell (topmost field name row)
              //   const finalBalanceHeaderCell = worksheet.getRow(2).getCell(finalBalanceIndex);
              //   finalBalanceHeaderCell.fill = {
              //     type: "pattern",
              //     pattern: "solid",
              //     fgColor: { argb: "FFFFFF00" }, // Yellow
              //   };
              //   finalBalanceHeaderCell.font = {
              //     bold: true,
              //     color: { argb: "FF0D5EF7" }, // Blue
              //   };

              //   // ✅ Fill all Final Balance cells in Issue Header rows
              //   finalBalanceColumn.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
              //     if (IssueheaderRowNumbers.has(rowNumber)) {
              //       cell.fill = {
              //         type: "pattern",
              //         pattern: "solid",
              //         fgColor: { argb: "FFFFFF00" }, // Yellow
              //       };
              //       cell.font = {
              //         bold: true,
              //         color: { argb: "FF0D5EF7" }, // Blue
              //       };
              //     }
              //   });

              // }
              // // Apply bold font and font color if not isOnlyWIP or isOnlyLP
              // if (!isOnlyWIP && !isOnlyLP) {
              //   row.font = {
              //     bold: true,
              //     color: { argb: isWIP ? "FF000000" : "FFD36BA4" }, // Black if WIP, else Maroon
              //   };
              // }

              // // Apply fill only if not WIP and not OnlyWIP/OnlyLP
              // row.eachCell({ includeEmpty: false }, (cell) => {
              //   if (!isWIP && !isOnlyWIP && !isOnlyLP) {
              //     cell.fill = {
              //       type: "pattern",
              //       pattern: "solid",
              //       fgColor: { argb: "FFEEECE1" }, // Light tan background
              //     };
              //   }
              // });

              const lightTanFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEECE1" } };
              if (isWIP || isOnlyWIP || isOnlyLP) {
                const sizeColors = [
                  "94DCF8", // 2XS
                  "DAF2D0", // XS
                  "94DCF8", // S
                  "FFCCCCCC", // M
                  "94DCF8", // L
                  "FADBD8", // XL
                  "FFCCCCCC", // 2XL
                  "DAF2D0", // 3XL
                  "F9CB9C",  // 4XL
                ];

                const finalBalanceIndex = 14; // 1-based column number
                const startCol = 15;           // First size column
                const columnsPerSize = sizeFields.length;

                // Precompute style objects
                const wipYellowFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
                const blueFont = { color: { argb: "FF0D5EF7" }, bold: true };

                // Determine which size indexes to color
                const sizeIndexesToColor = isOnlyWIP || isOnlyLP ? [0] : sizes.map((_, i) => i);

                // Apply size fills and fonts row by row
                sizeIndexesToColor.forEach((sizeIndex) => {
                  const color = sizeColors[sizeIndex];
                  const baseCol = startCol + sizeIndex * columnsPerSize;

                  for (let offset = 0; offset < columnsPerSize; offset++) {
                    const colIndex = baseCol + offset;

                    // Apply style only to the current row
                    const cell = row.getCell(colIndex);

                    const isWIPColumn = offset === wipIndexInSizeForWIPReport;

                    if (isWIPColumn && !isOnlyWIP && !isOnlyLP) {
                      // Yellow for WIP column in header row
                      cell.fill = wipYellowFill;
                      cell.font = blueFont;
                    } else {
                      // Normal size cell color
                      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
                      cell.font = blueFont;
                    }
                  }
                });

                // Final Balance column
                const finalBalanceCell = row.getCell(finalBalanceIndex);
                finalBalanceCell.fill = wipYellowFill;
                finalBalanceCell.font = blueFont;
              }

              // Determine font color
              let fontColor = "FF000000"; // default black
              if (isWIP || isOnlyWIP || isOnlyLP) {
                fontColor = isCpiClosed ? "FF0000FF" : "FF000000"; // blue if CPI closed
              } else if (isDetail) {
                fontColor = isCpiClosed ? "FF0000FF" : "FFD36BA4"; // Maroon / custom
              }

              // Apply font
              row.font = {
                bold: isDetail || false, // bold if detail
                color: { argb: fontColor },
              };


              // Apply fill only if not WIP and not OnlyWIP/OnlyLP
              if (!isWIP && !isOnlyWIP && !isOnlyLP) {
                row.eachCell({ includeEmpty: true }, (cell) => {
                  cell.fill = lightTanFill;
                });
              }
            }

            // if (filters.reportType !== "WIP" && filters.reportType !== "OnlyWIP" && filters.reportType !== "OnlyLP") {
            //   records.forEach((entry, index) => {
            //     const isLast = index === records.length - 1;
            //     const base = [
            //       parseInt(entry.SINo),
            //       entry.FGPS,
            //       parseInt(entry.OrderNo),
            //       formatDateToDDMMYYYY(entry.InscanDate),
            //       formatDateToDDMMYYYY(entry.StitchingDate),
            //       entry.ItemName,
            //       "",
            //       "",
            //       parseInt(entry.Total_GP),
            //       parseInt(entry.Total_EP),
            //       parseInt(entry.Total_FRP),
            //       parseInt(entry.Total_SWRP),
            //       parseInt(entry.Total_MP),
            //       parseInt(entry.Total_WIP),
            //     ];

            //     const sizeMap = {};
            //     (entry.sizes || []).forEach((size) => {
            //       const code = size.SizeCode;
            //       if (!sizeMap[code]) {
            //         sizeMap[code] = { IW: 0, GP: 0, EP: 0, FRP: 0, MP: 0, WIP: 0, LP: 0 };
            //       }
            //       sizeMap[code].GP += parseInt(size.GP) || 0;
            //       sizeMap[code].EP += parseInt(size.EP) || 0;
            //       sizeMap[code].FRP += parseInt(size.FRP) || 0;
            //       sizeMap[code].MP += parseInt(size.MP) || 0;
            //       sizeMap[code].WIP += parseInt(size.WIP) || 0;
            //       sizeMap[code].LP += parseInt(size.LP) || 0;
            //     });
            //     // ✅ Step 2: Override GP using IssueQty from lineMap


            //     const sizeData = sizes.flatMap((size) => {
            //       const s = sizeMap[size] || {};
            //       return sizeFields.map((f) => {
            //         const val = s[f] ?? "";
            //         if (f === "WIP") {
            //           return val === 0 ? 0 : val;
            //         } else {
            //           return val === 0 ? "" : val;
            //         }
            //       });
            //     });
            //     //temp readyfor wIP
            //     // const fields = isOnlyWIP ? ["WIP"] : sizeFields;
            //     // // const fields = sizeFields;

            //     // const sizeData = sizes.flatMap((size) => {
            //     //   const s = sizeMap[size] || {};
            //     //   return fields.map((f) => {
            //     //     const val = s[f] ?? "";
            //     //     return f === "WIP" ? (val === 0 ? 0 : val) : (val === 0 ? "" : val);
            //     //   });
            //     // });



            //     const newRow = worksheet.addRow([...base, ...sizeData]);
            //     // const currentRowNumber = newRow.number;
            //     newRow.height = 15; // ✅ Uniform heightf

            //     const columnsPerSize = sizeFields.length; // Typically 5 (GP, FRP, SWRP, MP, EP)
            //     const wipIndexInSize = sizeFields.indexOf("WIP");
            //     // const lastRowNumber = worksheet.lastRow.number;
            //     const startCol = 15; // Starting column index for sizes
            //     const sizeColors = [
            //       "94DCF8", // 2XS
            //       "DAF2D0", // XS
            //       "94DCF8", // S
            //       "FFCCCCCC", // M
            //       "94DCF8", // L
            //       "E49EDD", // XL
            //       "FFCCCCCC", // 2XL
            //       "DAF2D0", // 3XL
            //       "F9CB9C", // 4XL
            //     ];

            //     sizes.forEach((size, sizeIndex) => {
            //       const color = sizeColors[sizeIndex];
            //       const baseCol = startCol + sizeIndex * columnsPerSize;
            //       // const wipColIndex = startCol + sizeIndex * sizeFields.length + 6;

            //       for (let offset = 0; offset < columnsPerSize; offset++) {
            //         const colIndex = baseCol + offset;

            //         worksheet.getColumn(colIndex).eachCell((cell, rowNumber) => {
            //           // ✅ Apply blue font to non-header rows only
            //           if (!IssueheaderRowNumbers.has(rowNumber)) {
            //             const isWIPColumn = offset === wipIndexInSize;
            //             // const isLastRowWIP = isLast && isWIPColumn;
            //             const secondRowNumber = 2;

            //             // if (colIndex !== isWIPColumn) {
            //             if (!(IssueheaderRowNumbers.has(rowNumber + 1) && isWIPColumn && rowNumber !== secondRowNumber)) {
            //               cell.fill = {
            //                 type: "pattern",
            //                 pattern: "solid",
            //                 fgColor: { argb: color },
            //               };
            //             }

            //             cell.font = {
            //               color: { argb: "FF0D5EF7" }, // Blue font
            //               bold: true,
            //             };
            //           }
            //         });
            //       }
            //     });
            //     // ✅ 🔶 Highlight WIP cells only for the LAST record
            //     if (isLast) {
            //       // Total WIP yellow highlight
            //       newRow.getCell(14).fill = {
            //         type: "pattern",
            //         pattern: "solid",
            //         fgColor: { argb: "FFFF00" },
            //       };
            //       newRow.getCell(14).font = { bold: true };

            //       // Yellow highlight only WIP size cells
            //       sizes.forEach((size, sizeIndex) => {
            //         const wipColIndex = startCol + sizeIndex * sizeFields.length + 7;
            //         const cell = newRow.getCell(wipColIndex);
            //         if (cell.value !== "") {
            //           cell.fill = {
            //             type: "pattern",
            //             pattern: "solid",
            //             fgColor: { argb: "FFFF00" }, // Yellow
            //           };
            //           cell.font = { bold: true };
            //         }
            //       });
            //     }

            //   });
            // }

            //DPR-DETAIL
            if (filters.reportType !== "WIP" && filters.reportType !== "OnlyWIP" && filters.reportType !== "OnlyLP") {
              records.forEach((entry, index) => {
                const isLast = index === records.length - 1;

                const base = [
                  parseInt(entry.SINo),
                  entry.FGPS,
                  parseInt(entry.OrderNo),
                  formatDateToDDMMYYYY(entry.InscanDate),
                  entry.ItemName,
                  entry.Color,
                  "",
                  "",
                  parseInt(entry.Total_GP),
                  parseInt(entry.Total_EP),
                  parseInt(entry.Total_FRP),
                  parseInt(entry.Total_SWRP),
                  parseInt(entry.Total_MP),
                  parseInt(entry.Total_WIP),
                ];

                // Build size map
                const sizeMap = {};
                (entry.sizes || []).forEach((size) => {
                  const code = size.SizeCode;
                  if (!sizeMap[code]) sizeMap[code] = { IW: 0, GP: 0, EP: 0, FRP: 0, MP: 0, WIP: 0, LP: 0 };

                  ["GP", "EP", "FRP", "MP", "WIP", "LP"].forEach((f) => {
                    sizeMap[code][f] += parseInt(size[f]) || 0;
                  });
                });

                const sizeData = sizes.flatMap((size) => {
                  const s = sizeMap[size] || {};
                  return sizeFields.map((f) => {
                    if (f === "WIP") return s[f] ?? 0; // WIP: keep 0
                    return s[f] != null && s[f] !== 0 ? s[f] : " "; // Other fields: null for empty
                  });
                });
                // Determine font color based on isCpiClosed
                const fontColor = isDetail
                  ? isCpiClosed
                    ? "FF0000FF" // Blue if CPI closed
                    : "FF000000" // FFD36BA4 // Maroon / custom
                  : "FF000000"; // Default black for normal rows

                const newRow = worksheet.addRow([...base, ...sizeData]);
                newRow.height = 15;

                // Apply base styling to all cells in newRow
                newRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                  cell.font = { color: { argb: fontColor } };
                });

                const columnsPerSize = sizeFields.length;
                const wipIndexInSize = sizeFields.indexOf("WIP");
                const startCol = 15;

                const sizeColors = [
                  "94DCF8", "DAF2D0", "94DCF8", "FFCCCCCC", "94DCF8", "E49EDD", "FFCCCCCC", "DAF2D0", "F9CB9C"
                ];

                // ✅ Apply colors and fonts only to newRow cells
                sizes.forEach((size, sizeIndex) => {
                  const color = sizeColors[sizeIndex];
                  const baseCol = startCol + sizeIndex * columnsPerSize;

                  for (let offset = 0; offset < columnsPerSize; offset++) {
                    const colIndex = baseCol + offset;
                    const cell = newRow.getCell(colIndex);

                    // Skip header rows
                    if (!IssueheaderRowNumbers.has(newRow.number)) {
                      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
                      cell.font = { color: { argb: fontColor }, bold: true }; //"FF0D5EF7"
                    }
                  }
                });

                // ✅ Highlight WIP cells only for last row
                if (isLast) {
                  newRow.getCell(14).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
                  newRow.getCell(14).font = { bold: true };

                  sizes.forEach((size, sizeIndex) => {
                    const wipColIndex = startCol + sizeIndex * columnsPerSize + wipIndexInSize;
                    const cell = newRow.getCell(wipColIndex);
                    if (cell.value !== "") {
                      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
                      cell.font = { bold: true };
                    }
                  });
                }
              });
            }

          });
          // 🔹 update progress using local counter
          // localCount++;
          // setProcessedCount(localCount);
          // setProgress(Math.round((localCount / result.head.length) * 100));
        });
        // ✅ Step 4.5: Create table from existing filled rows
        // const tableStartCell = 'A2'; // Header starts at A2

        // // ✅ STEP 4.5: Build table from actual header and filled data rows
        // const headerRow = worksheet.getRow(2).values.slice(1); // Get header from row 2

        // // ⚠️ Ensure headers are all valid strings (no null/undefined/numbers)
        // const cleanedHeaders = headerRow.map((header, i) => {
        //   if (typeof header === "string") return header;
        //   if (typeof header === "object" && header?.richText?.[0]?.text)
        //     return header.richText[0].text;
        //   return `Col${i + 1}`; // fallback name
        // });

        // // ✅ Collect rows and ensure same column count
        // const dataRows = [];
        // for (let i = 3; i <= worksheet.rowCount; i++) {
        //   const row = worksheet.getRow(i);
        //   const values = row.values.slice(1); // skip null
        //   const fixedRow = Array(cleanedHeaders.length).fill("");
        //   values.forEach((val, idx) => {
        //     fixedRow[idx] = val ?? "";
        //   });
        //   dataRows.push(fixedRow);
        // }

        // // ✅ Add Excel Table with valid headers and rows
        // worksheet.addTable({
        //   name: "DPRTable",
        //   ref: "A2", // table starts at second row
        //   headerRow: true,
        //   style: {
        //     theme: "TableStyleLight1",
        //     showRowStripes: false,
        //   },
        //   columns: cleanedHeaders.map((name) => ({ name })),
        //   rows: dataRows,
        // });

        // Add borders and formatting manually
        for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
          const row = worksheet.getRow(rowIndex);
          row.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FF000000" } },
              left: { style: "thin", color: { argb: "FF000000" } },
              bottom: { style: "thin", color: { argb: "FF000000" } },
              right: { style: "thin", color: { argb: "FF000000" } },
            };

            // ✅ Skip alignment for header row 2
            if (rowIndex !== 2) {
              cell.alignment = {
                vertical: "middle",
                horizontal: (colNumber === 5 || colNumber === 6) ? "left" : colNumber > 6 ? "right" : "center",
                wrapText: false,
              };
            }
          });
        }

        // 2️⃣ Set column widths AFTER all .addRow() calls
        const columnWidths = [
          6,  // CPI#
          10,  // FGPS
          8,  // Ord.No
          10,  // CPI Dt & In Scan Dt.
          21, // ItemName.
          20, // Color
          6, // IW
          6, // OW
          6,  // GP
          4,  // EP
          4,  // FRP
          6,  // SWRP
          4,  // MP
          5,  // WIP
          // 5,  // WIP
          ...sizes.flatMap(() =>
            sizeFields.map((field) => (field === "SWRP" ? 6 : 4))
          ),
        ];

        columnWidths.forEach((width, index) => {
          worksheet.getColumn(index + 1).width = width;
        });


        // worksheet.columns.forEach((column) => {
        //   let maxLength = 0;

        //   column.eachCell({ includeEmpty: false }, (cell) => {
        //     let value = cell.value;

        //     if (typeof value === "object" && value?.richText) {
        //       value = value.richText.map((part) => part.text).join("");
        //     } else if (typeof value !== "string") {
        //       value = value?.toString() || "";
        //     }

        //     const cellLength = value.length;
        //     if (cellLength > maxLength) {
        //       maxLength = cellLength;
        //     }
        //   });

        //   // Approximate autofit: no buffer, and clamp to reasonable width
        //   column.width = Math.min(Math.max(maxLength, 5), 30);
        // });



        // 🟢 Step 6: Export the file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const firstSINo = result.data[0]?.SINo || "FILTERED";
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, "0");
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const yy = String(now.getFullYear()).slice(2);
        const hh = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");

        // const fileName = `${isWIP ? "WIP_Detail" : "DPR_Detail"}_${dd}${mm}${yy}_${hh}${min}.xlsx`;
        let reportLabel = "DPR_Detail";

        if (isOnlyWIP) {
          reportLabel = "WIP_Summary";
        } else if (isOnlyLP) {
          reportLabel = "LP_Summary";
        } else if (isWIP) {
          reportLabel = "DPR_Abstract";
        }

        const fileName = `${reportLabel}_${dd}${mm}${yy}_${hh}${min}.xlsx`;


        saveAs(blob, fileName);
      }
      // };

      // eventSource.onerror = (err) => {
      //   console.error("❌ SSE connection error:", err);
      //   eventSource.close();
      //   setLoading(false);
      //   alert("❌ Export failed. Please try again.");
      // };
    } catch (error) {
      console.error("❌ Export failed:", error);
      alert("❌ Export failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="filter-container" style={{ marginRight: "0.5%" }} >
      {/* {loading && <Loader message="Exporting..." progress={progress} />} */}
      {loading && <Loader message="Exporting..." progress={progress} processed={processedCount} total={totalData} />}


      {/* Location Filter */}
      {/* <h2 className="filter-title">DPR Report</h2> */}
      <div className="filter-row" style={{ display: "flex", marginTop: "15px" }}>
        <h3 className="filter-heading">Location:</h3>
        <label style={{ display: "flex", alignItems: "center", marginRight: "20px" }}>
          <input
            type="radio"
            name="location"
            value="001"
            checked={filters.InputLocationID === "001"}
            onChange={(e) => {
              handleInputChange("InputLocationID", e.target.value);
            }}
            style={{ marginRight: "8px" }} // Space between radio and label
          />
          Tirupur
        </label>
        <label style={{ display: "flex", alignItems: "center", marginRight: "20px" }}>
          <input
            type="radio"
            name="location"
            value="002"
            checked={filters.InputLocationID === "002"}
            onChange={(e) => {
              handleInputChange("InputLocationID", e.target.value);
            }} style={{ marginRight: "8px" }} // Space between radio and label
          />
          Nallur
        </label>
        <label style={{ display: "flex", alignItems: "center" }}>
          <input
            type="radio"
            name="location"
            value="Both"
            checked={filters.InputLocationID === "Both"}
            onChange={(e) => {
              handleInputChange("InputLocationID", e.target.value);
            }} style={{ marginRight: "8px" }} // Space between radio and label
          />
          Both
        </label>
      </div>
      <div className="filter-grid">

        {/* CPI No Section */}
        <div className="filter-section" style={{ width: "70px" }}>
          <h3 className="filter-heading">CPI No</h3>
          {/* <div className="filter-field-group"> */}
          {/* <input
              type="text"
              placeholder="CPI No"
              value={filters.cpiNo}
              onChange={(e) => handleInputChange("cpiNo", e.target.value)}
              className="filter-input"
            /> */}
          {/* <div className="filter-row"> */}
          <input
            type="text"
            placeholder="From"
            maxLength={5}
            value={filters.cpiFrom}
            onChange={(e) => handleInputChange("cpiFrom", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                cpiToRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={`filter-input`}
            style={{ width: "60px" }} // 👈 inline style to reduce width
          />
          <input
            ref={cpiToRef}
            type="text"
            placeholder="To"
            maxLength={5}
            value={filters.cpiTo}
            onChange={(e) => handleInputChange("cpiTo", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyButtonRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={`filter-input`}
            style={{ width: "60px" }} // 👈 inline style to reduce width
          />
          {/* </div> */}
          {/* </div> */}
        </div>
        {/* FGPS Date Section */}
        <div className="filter-section">
          <h3 className="filter-heading">CPI Date</h3>
          {/* <div className="filter-row"> */}
          <input
            type="date"
            value={filters.cpiDateFrom}
            onChange={(e) =>
              handleInputChange("cpiDateFrom", e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                cpiDateToRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={"filter-input"} />          <input
            ref={cpiDateToRef}
            type="date"
            value={filters.cpiDateTo}
            onChange={(e) => handleInputChange("cpiDateTo", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyButtonRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={"filter-input"} />          {/* </div> */}
        </div>

        {/* Dpr NO */}
        <div className="filter-section" style={{ width: "70px" }}  >
          <h3 className="filter-heading">DPR No</h3>
          {/* <div className="filter-field-group"> */}
          {/* <div className="filter-row"> */}
          <input
            type="text"
            placeholder="From"
            maxLength={6}
            value={filters.dprFrom}
            onChange={(e) => handleInputChange("dprFrom", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                dprToRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={`filter-input`} // 👈 inline style to reduce width
            style={{ width: "70px" }} // 👈 inline style to reduce width
          />
          <input
            ref={dprToRef}
            type="text"
            placeholder="To"
            maxLength={6}
            value={filters.dprTo}
            onChange={(e) => handleInputChange("dprTo", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyButtonRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={`filter-input`}
            style={{ width: "70px" }} // 👈 inline style to reduce width
          />
          {/* </div> */}
          {/* </div> */}
        </div>


        {/* DPR Date Section */}
        <div className="filter-section">
          <h3 className="filter-heading">DPR Date</h3>
          {/* <div className="filter-row"> */}
          <input
            type="date"
            value={filters.dprDateFrom}
            onChange={(e) =>
              handleInputChange("dprDateFrom", e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                dprDateToRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={"filter-input"} />
          <input
            ref={dprDateToRef}
            type="date"
            value={filters.dprDateTo}
            onChange={(e) => handleInputChange("dprDateTo", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyButtonRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={"filter-input"} />          {/* </div> */}
        </div>
        {/* FGPS Date Section */}
        <div className="filter-section">
          <h3 className="filter-heading">FGPS Date</h3>
          {/* <div className="filter-row"> */}
          <input
            type="date"
            value={filters.fgpsDateFrom}
            onChange={(e) =>
              handleInputChange("fgpsDateFrom", e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                fgpsDateToRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={"filter-input"} />          <input
            ref={fgpsDateToRef}
            type="date"
            value={filters.fgpsDateTo}
            onChange={(e) => handleInputChange("fgpsDateTo", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyButtonRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={"filter-input"} />          {/* </div> */}
        </div>

        {/* FGPS No Section */}
        {/* <div className="filter-section">
          <h3 className="filter-heading">FGPS No</h3>
          <div className="filter-row">
            <select
              value={filters.fgpsType}
              onChange={(e) => handleInputChange("fgpsType", e.target.value)}
              className="readonly-input"
              disabled
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  fgpsFromRefs.current?.focus(); // Move to Inscan Date
                }
              }}
              style={{ width: "70px", padding: "4px", fontSize: "13px" }}
            >
              <option value="">Type</option>
              <option value="VL">VL</option>
              <option value="FA">FA</option>
              <option value="IW">IW</option>
            </select >
            <input
              type="text"
              placeholder="FGPS No"
              value={filters.fgpsNo}
              onChange={(e) => handleInputChange("fgpsNo", e.target.value)}
              className="filter-input"
            />
            <div className="filter-row">
              <input
                ref={fgpsFromRefs}
                type="text"
                placeholder="From"
                value={filters.fgpsFrom}
                onChange={(e) => handleInputChange("fgpsFrom", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fgpsToRefs.current?.focus(); // Move to Inscan Date
                  }
                }}
                className="filter-input readonly-input"
                readOnly />
              <input
                ref={fgpsToRefs}
                type="text"
                placeholder="To"
                value={filters.fgpsTo}
                onChange={(e) => handleInputChange("fgpsTo", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyButtonRef.current?.focus(); // Move to Inscan Date
                  }
                }}
                className="filter-input readonly-input"
                readOnly
              />
            </div>
          </div>
        </div> */}

        {/* Item Name */}
        {/* <div className="filter-section">
          <h3 className="filter-heading">Item Name</h3>
          <input
            type="text"
            placeholder="Item Name"
            value={filters.itemName}
            onChange={(e) => handleInputChange("itemName", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyButtonRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className="filter-input readonly-input"
            readonly
          />
        </div> */}

        {/* Scan Date */}
        {/* <div className="filter-section">
          <h3 className="filter-heading">Scan Date</h3>
          <input
            type="date"
            value={filters.scanDateFrom}
            onChange={(e) =>
              handleInputChange("scanDateFrom", e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                scanDateToRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={"filter-input"} />          <input
            ref={scanDateToRef}
            type="date"
            value={filters.scanDateTo}
            onChange={(e) => handleInputChange("scanDateTo", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyButtonRef.current?.focus(); // Move to Inscan Date
              }
            }}
            className={"filter-input"} />
        </div> */}

        {/* Stitching Date */}
        {/* <div className="filter-section">
          <h3 className="filter-heading">Stitching Date</h3>
          <div className="filter-row">
            <input
              type="date"
              value={filters.stitchingDateFrom}
              onChange={(e) =>
                handleInputChange("stitchingDateFrom", e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  stitchingDateToRef.current?.focus(); // Move to Inscan Date
                }
              }}
              className="filter-input readonly-input"
              readonly
            />
            <input
              ref={stitchingDateToRef}
              type="date"
              value={filters.stitchingDateTo}
              onChange={(e) =>
                handleInputChange("stitchingDateTo", e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyButtonRef.current?.focus(); // Move to Inscan Date
                }
              }}
              className="filter-input readonly-input"
              readonly
            />
          </div>
        </div> */}
        {/* Report Type Section */}
        <div className="filter-section">
          <div className="radio-group-container">
            {/* First row */}
            <h3 className="filter-heading">Report Type</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="reportType"
                  value="Detail"
                  checked={filters.reportType === "Detail"}
                  onChange={(e) => handleInputChange("reportType", e.target.value)}
                  className="radio-input"
                />
                <span>DPR Detail</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="reportType"
                  value="WIP"
                  checked={filters.reportType === "WIP"}
                  onChange={(e) => handleInputChange("reportType", e.target.value)}
                  className="radio-input"
                />
                <span>DPR Abstract</span>
                {/* <i style={{ fontSize: "15px", color: "#285ae6" }} >(DPR Summary)</i> */}
              </label>
              {/* </div> */}

              {/* Second row */}
              {/* <div className="radio-group"> */}
              <label className="radio-label">
                <input
                  type="radio"
                  name="reportType"
                  value="OnlyWIP"
                  checked={filters.reportType === "OnlyWIP"}
                  onChange={(e) => handleInputChange("reportType", e.target.value)}
                  className="radio-input"
                />
                <span>WIP Summary</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="reportType"
                  value="OnlyLP"
                  checked={filters.reportType === "OnlyLP"}
                  onChange={(e) => handleInputChange("reportType", e.target.value)}
                  className="radio-input"
                />
                <span>LP Summary</span>
              </label>
            </div>
            {/* <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="reportType"
                  value=""
                  checked={filters.reportType === ""}
                  onChange={(e) => handleInputChange("reportType", e.target.value)}
                  className="radio-input"
                />
                <span>WIP ItemWise</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="reportType"
                  value="OnlyLP"
                  checked={filters.reportType === "OnlyLP"}
                  onChange={(e) => handleInputChange("reportType", e.target.value)}
                  className="radio-input"
                />
                <span>LP ItemWise</span>
              </label>
            </div> */}
          </div>

        </div>


      </div>

      {/* Buttons */}
      <div className="filter-actions">
        <button onClick={handleClearFilters} className="btn btn-clear">
          Clear Filters
        </button>
        <button
          ref={applyButtonRef}
          onClick={handleApplyFilters}
          className="btn btn-apply"
        >
          Apply & Export
        </button>
      </div>
      {/* ✅ Show Instructions below filters */}
      {/* <Instruction /> */}
    </div>
  );
}


// Rest of your component logic here...

// export default FilterComponent;
// export default DPRForm;

export default CutPanelInwardPage;
