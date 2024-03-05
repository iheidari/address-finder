import { Text, View, StyleSheet, Button } from "react-native";
import { useState } from "react";
import * as Location from "expo-location";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";

export default function App() {
  const [errorMsg, setErrorMsg] = useState(null);
  const [status, setStatus] = useState("");

  const fetchLocation = async () => {
    try {
      setStatus("Load location...");
      setErrorMsg("");
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        setStatus("");
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      return currentLocation.coords;
    } catch (error) {
      setErrorMsg("Error fetching location");
      setStatus("");
    }
  };

  const fetchAddress = async (location) => {
    try {
      setStatus("Address loading...");
      const latlng = `${location.latitude},${location.longitude}`;

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latlng}&key=${process.env.EXPO_PUBLIC_GOOGLE_API_KEY}`;

      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url,
        headers: {
          Accept: "application/json",
        },
      };

      const response = await axios.request(config);
      return response.data.results[0];
    } catch (error) {
      setErrorMsg("Error fetching address");
      setStatus("");
    }
  };

  const getBcShortAddress = (googleAddress) => {
    // '277 Harvard Dr, Port Moody, BC V3H 1S9, Canada'
    const regex = /, BC.*$/;
    if (regex.test(googleAddress.formatted_address)) {
      return googleAddress.formatted_address.replace(/, BC.*$/, "");
    }
    return "";
  };

  const getBcAssessmentUrl = async (shortAddress) => {
    try {
      setStatus("Load BC assessment page...");
      setErrorMsg("");
      const bcResult = await axios.get(
        `https://www.bcassessment.ca/Property/Search/GetByAddress?addr=${shortAddress}`
      );

      // result.data: [{"gid": null, "label": "277 HARVARD DR PORT MOODY", "value": "QTAwMDAzVkY2Tg=="}]
      const bcId = bcResult.data[0].value;
      return `https://www.bcassessment.ca//Property/Info/${bcId}`;
    } catch (error) {
      setErrorMsg("Error fetching BC assessment");
      setStatus("");
    }
  };

  const handleGetAssessment = async () => {
    const currentLocation = await fetchLocation();
    console.log("🚀 ~ handleGetAssessment ~ currentLocation:", currentLocation);
    const address = await fetchAddress(currentLocation);
    console.log("🚀 ~ handleGetAssessment ~ address:", address);
    const shortAddress = getBcShortAddress(address);
    console.log("🚀 ~ handleGetAssessment ~ shortAddress:", shortAddress);
    if (!shortAddress) {
      setErrorMsg(`Invalid or non-BC address\n${address.formatted_address}`);
      setStatus("");
      return;
    }
    const bcAssessmentUrl = await getBcAssessmentUrl(shortAddress);
    console.log("🚀 ~ handleGetAssessment ~ bcAssessmentUrl:", bcAssessmentUrl);
    setStatus("");
    await WebBrowser.openBrowserAsync(bcAssessmentUrl);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.paragraph}>{errorMsg}</Text>
      <Text style={styles.paragraph}>{status}</Text>
      <Button
        title="Get Assessment"
        onPress={handleGetAssessment}
        disabled={!!status}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
