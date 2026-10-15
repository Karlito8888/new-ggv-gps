import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Linking, Platform, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map,
  Marker,
  type CameraRef,
  type LayerSpecification,
} from "@maplibre/maplibre-react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import type { FeatureCollection } from "geojson";
import {
  ARRIVAL_ZONE_PAINT,
  BLOCK_LABEL_LAYOUT,
  BLOCK_LABEL_PAINT,
  MAP_INITIAL_ZOOM,
  ROUTE_ARROW_LAYOUT,
  ROUTE_LINE_LAYOUT,
  ROUTE_LINE_PAINT,
  ROUTE_OUTLINE_LAYOUT,
  ROUTE_OUTLINE_PAINT,
  VILLAGE_BOUNDS,
  VILLAGE_CENTER,
  blockLabelsGeoJSON,
  useCourseUpCamera,
  useNavigationFlow,
  useRouting,
  type CameraDriver,
  type RouteGeometry,
} from "@ggv/shared";
import basemapLayers from "@ggv/shared/basemap-layers";
import * as Sentry from "@sentry/react-native";
import { COPY, inline, isBelowVersion } from "@ggv/shared";
import { APP_CONFIG_URL, CONVEX_URL, SENTRY_DSN, STORE_URL } from "./config";
import { ensureMapAssets, type MapAssetUrls } from "./map/mapAssets";
import { buildMobileStyle } from "./map/mobileStyle";
import { useDeviceLocation } from "./useDeviceLocation";
import { villageSnapshot } from "./villageSnapshot";
import { GpsPermission } from "./screens/GpsPermission";
import { Welcome } from "./screens/Welcome";
import { Navigation } from "./screens/Navigation";
import { Arrived } from "./screens/Arrived";
import { ExitComplete } from "./screens/ExitComplete";
import { Body, Button, Modal, Title } from "./ui";
import { theme } from "./theme";

// Events are only sent from release builds; `Sentry.wrap` below adds the touch breadcrumbs.
Sentry.init({ dsn: SENTRY_DSN, enabled: !__DEV__, sendDefaultPii: false });

// `unsavedChangesWarning` registers a `window` listener that does not exist in React Native.
const convex = new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false });

const BLOCK_LABELS = blockLabelsGeoJSON();
const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };
const ROUTE_ARROW = require("../assets/map/route-arrow.png");
const LOGO = require("../../web/src/assets/img/ggv.png");
const BELL = require("../../web/src/assets/audio/arrival-bell.mp3");

/** Keeps the screen on for as long as it is mounted (rendered only while navigating). */
function NavigationKeepAwake() {
  useKeepAwake("navigation");
  return null;
}

function Root({ assets }: { assets: MapAssetUrls }) {
  const style = useMemo(
    () => buildMobileStyle(assets, basemapLayers as unknown as LayerSpecification[]),
    [assets]
  );
  const [mapReady, setMapReady] = useState(false);
  const [routeLine, setRouteLine] = useState<RouteGeometry | null>(null);
  const cameraRef = useRef<CameraRef>(null);
  const panListeners = useRef(new Set<() => void>());

  const { userLocation, start, stop: stopLocation } = useDeviceLocation();
  const bell = useAudioPlayer(BELL);

  const flow = useNavigationFlow(userLocation, () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    bell.seekTo(0);
    bell.play();
  });
  const { navState, destination, showArrivedModal } = flow;
  const navigating = navState === "navigating";
  // Terminal screen: the GPS watch would only drain the battery under "Safe Travels".
  useEffect(() => {
    if (navState === "exit-complete") stopLocation();
  }, [navState, stopLocation]);

  const { steps, routeSource, routeGeoJSON, isRecalculating } = useRouting(
    mapReady,
    userLocation,
    destination,
    setRouteLine,
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  );

  const driver = useMemo<CameraDriver | null>(
    () =>
      mapReady
        ? {
            jumpTo: (o) => cameraRef.current?.jumpTo(o),
            easeTo: (o) => cameraRef.current?.easeTo({ ...o, easing: "linear" }),
            onUserPan: (cb) => {
              panListeners.current.add(cb);
              return () => {
                panListeners.current.delete(cb);
              };
            },
          }
        : null,
    [mapReady]
  );
  useCourseUpCamera(driver, navigating, userLocation);

  const liveBlocks = useQuery(anyApi.locations.blocks) as string[] | undefined;

  return (
    <View style={styles.root}>
      <Map
        style={styles.root}
        mapStyle={style}
        compass={false}
        logo={false}
        touchRotate={false}
        onDidFinishLoadingStyle={() => setMapReady(true)}
        onRegionWillChange={(e) => {
          if (e.nativeEvent.userInteraction) panListeners.current.forEach((cb) => cb());
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: VILLAGE_CENTER, zoom: MAP_INITIAL_ZOOM }}
          maxBounds={[
            VILLAGE_BOUNDS.west,
            VILLAGE_BOUNDS.south,
            VILLAGE_BOUNDS.east,
            VILLAGE_BOUNDS.north,
          ]}
        />
        <Images images={{ "route-arrow": ROUTE_ARROW }} onImageMissing={() => {}} />

        <GeoJSONSource id="block-labels" data={BLOCK_LABELS}>
          <Layer
            id="block-labels"
            type="symbol"
            // Same layout as web; only the font name differs (the on-disk glyph alias).
            layout={{ ...BLOCK_LABEL_LAYOUT, "text-font": ["noto-sans-regular"] }}
            paint={{ ...BLOCK_LABEL_PAINT }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="route" data={routeLine ?? EMPTY_FC}>
          <Layer
            id="route-outline"
            type="line"
            layout={{ ...ROUTE_OUTLINE_LAYOUT }}
            paint={{ ...ROUTE_OUTLINE_PAINT }}
          />
          <Layer
            id="route-line"
            type="line"
            layout={{ ...ROUTE_LINE_LAYOUT }}
            paint={{ ...ROUTE_LINE_PAINT }}
          />
          <Layer id="route-arrows" type="symbol" layout={{ ...ROUTE_ARROW_LAYOUT }} />
        </GeoJSONSource>

        <GeoJSONSource
          id="arrival-zone"
          data={
            destination
              ? {
                  type: "Feature",
                  properties: {},
                  geometry: { type: "Point", coordinates: destination.coordinates },
                }
              : EMPTY_FC
          }
        >
          <Layer id="arrival-zone-circle" type="circle" paint={ARRIVAL_ZONE_PAINT as never} />
        </GeoJSONSource>

        {navigating && userLocation ? (
          <Marker lngLat={[userLocation.longitude, userLocation.latitude]} anchor="center">
            <View style={styles.userDot}>
              <View style={styles.userArrow} />
            </View>
          </Marker>
        ) : null}
        {navigating && destination ? (
          <Marker lngLat={destination.coordinates} anchor="center">
            <View style={styles.destDot} />
          </Marker>
        ) : null}
      </Map>

      <Image source={LOGO} style={styles.logo} resizeMode="contain" />

      {navigating ? <NavigationKeepAwake /> : null}

      {navState === "gps-permission" ? (
        <GpsPermission isMapReady={mapReady} start={start} onGrant={flow.grantGps} />
      ) : null}
      {navState === "welcome" ? (
        <Welcome
          blocks={liveBlocks ?? villageSnapshot.blocks}
          onSelectDestination={flow.selectDestination}
        />
      ) : null}
      {navigating && !showArrivedModal ? (
        <Navigation
          distanceRemaining={flow.distanceRemaining}
          destination={destination}
          steps={steps}
          routeSource={routeSource}
          routeGeoJSON={routeGeoJSON}
          userLocation={userLocation}
          isRecalculating={isRecalculating}
          onCancel={flow.cancelNavigation}
        />
      ) : null}
      {navState === "exit-complete" ? <ExitComplete /> : null}
      {showArrivedModal ? (
        <Arrived
          destination={destination}
          onNavigateAgain={flow.navigateAgain}
          onExitVillage={flow.exitVillage}
        />
      ) : null}
    </View>
  );
}

function AppContent() {
  const [assets, setAssets] = useState<MapAssetUrls | null>(null);
  // Setting state to a thrown value lets the render below rethrow it to the error boundary.
  const [error, setError] = useState<unknown>(null);
  const [updateRequired, setUpdateRequired] = useState(false);
  useEffect(() => {
    ensureMapAssets().then(setAssets, setError);
    // Offline or unreachable floor: skipped. It must never stand between a user and the map.
    fetch(`${APP_CONFIG_URL}?t=${Date.now()}`)
      .then((response) => response.json())
      .then((floor: { minIos?: string; minAndroid?: string }) => {
        const min = Platform.OS === "ios" ? floor.minIos : floor.minAndroid;
        const version = Constants.expoConfig?.version;
        if (min && version && isBelowVersion(version, min)) setUpdateRequired(true);
      })
      .catch(() => {});
  }, []);
  if (error) throw error;
  if (updateRequired) return <UpdateRequired />;
  if (!assets) return null;

  return (
    <SafeAreaProvider>
      <ConvexProvider client={convex}>
        <Root assets={assets} />
      </ConvexProvider>
    </SafeAreaProvider>
  );
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorScreen}>
      <Modal>
        <Title en={COPY.error.title.en} tl={COPY.error.title.tl} />
        <Body en={COPY.error.unexpected.en} />
        <Body en={COPY.error.reloadPrompt.en} tl={COPY.error.reloadPrompt.tl} />
        <Button label={inline(COPY.error.retry)} onPress={onRetry} />
      </Modal>
    </View>
  );
}

/** No way past it but the store: a version below the floor has lost its backend contract. */
function UpdateRequired() {
  return (
    <View style={styles.errorScreen}>
      <Modal>
        <Title en={COPY.forceUpdate.title.en} tl={COPY.forceUpdate.title.tl} />
        <Body en={COPY.forceUpdate.body.en} tl={COPY.forceUpdate.body.tl} />
        <Button
          label={inline(COPY.forceUpdate.button)}
          onPress={() => Linking.openURL(Platform.OS === "ios" ? STORE_URL.ios : STORE_URL.android)}
        />
      </Modal>
    </View>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback onRetry={resetError} />}>
      <AppContent />
    </Sentry.ErrorBoundary>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorScreen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: theme.overlay },
  logo: {
    position: "absolute",
    top: theme.logoTop,
    alignSelf: "center",
    height: theme.logoHeight,
    width: 145,
  },
  userDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Up is the direction of travel: the map is course-up.
  userArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: ROUTE_LINE_PAINT["line-color"],
  },
  destDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.error,
    borderWidth: 3,
    borderColor: "#fff",
  },
});
