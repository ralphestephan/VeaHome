import { useState } from "react";
import { Lightbulb, Thermometer, Tv, Wind, ChevronLeft, Speaker, Camera, Lock, Wifi } from "lucide-react";
import { DeviceTile } from "./DeviceTile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import smartHomeImage from "figma:asset/4239477678dba8bff484942536b80f83ac9c74f8.png";

interface DevicesScreenProps {
  onSelectThermostat: () => void;
}

export function DevicesScreen({ onSelectThermostat }: DevicesScreenProps) {
  const [bedroomLight, setBedroomLight] = useState(false);
  const [floorLight, setFloorLight] = useState(true);
  const [mainLight, setMainLight] = useState(true);
  const [deskLamp, setDeskLamp] = useState(false);
  const [kitchenLight1, setKitchenLight1] = useState(true);
  const [kitchenLight2, setKitchenLight2] = useState(true);
  const [bathroomLight, setBathroomLight] = useState(false);
  const [hallwayLight, setHallwayLight] = useState(true);
  const [officeLight, setOfficeLight] = useState(false);
  const [gardenLight, setGardenLight] = useState(false);
  
  const [livingFan, setLivingFan] = useState(true);
  const [bedroomThermostat, setBedroomThermostat] = useState(false);
  const [kitchenThermostat, setKitchenThermostat] = useState(true);
  
  const [tvActive, setTvActive] = useState(true);
  const [soundbar, setSoundbar] = useState(true);
  const [speaker, setSpeaker] = useState(false);
  const [bedroomTv, setBedroomTv] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Devices</h2>
          <p className="text-xs text-muted-foreground">38 devices connected</p>
        </div>
        <button className="rounded-xl bg-primary px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95">
          Add Device
        </button>
      </div>

      {/* Smart Home Image */}
      <div className="mb-6 relative overflow-hidden rounded-3xl">
        <img
          src={smartHomeImage}
          alt="Smart Home"
          className="h-48 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-lg text-white">All Devices</h3>
          <p className="text-sm text-white/70">Control everything from one place</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="lights" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-5 gap-1 rounded-2xl bg-secondary p-1">
          <TabsTrigger
            value="lights"
            className="rounded-xl text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Lights
          </TabsTrigger>
          <TabsTrigger
            value="climate"
            className="rounded-xl text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Climate
          </TabsTrigger>
          <TabsTrigger
            value="windows"
            className="rounded-xl text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Shutters
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="rounded-xl text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Media
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-xl text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lights" className="space-y-6 pb-20">
          {/* Bedroom */}
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Bedroom</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Lightbulb}
                name="Dimmer"
                isActive={bedroomLight}
                onClick={() => setBedroomLight(!bedroomLight)}
              />
            </div>
          </div>

          {/* Living Room */}
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Living Room</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Lightbulb}
                name="Main Lights"
                value={70}
                unit="%"
                isActive={mainLight}
                onClick={() => setMainLight(!mainLight)}
              />
              <DeviceTile
                icon={Lightbulb}
                name="Desk Lamp"
                isActive={deskLamp}
                onClick={() => setDeskLamp(!deskLamp)}
              />
            </div>
          </div>

          {/* Kitchen */}
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Kitchen</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Lightbulb}
                name="Main Lights"
                isActive={kitchenLight1}
                onClick={() => setKitchenLight1(!kitchenLight1)}
              />
              <DeviceTile
                icon={Lightbulb}
                name="Counter"
                isActive={kitchenLight2}
                onClick={() => setKitchenLight2(!kitchenLight2)}
              />
            </div>
          </div>

          {/* Bathroom */}
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Bathroom</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Lightbulb}
                name="Main Light"
                isActive={bathroomLight}
                onClick={() => setBathroomLight(!bathroomLight)}
              />
              <DeviceTile
                icon={Lightbulb}
                name="Mirror"
                value={80}
                unit="%"
                isActive={hallwayLight}
                onClick={() => setHallwayLight(!hallwayLight)}
              />
            </div>
          </div>

          {/* Office */}
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Office</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Lightbulb}
                name="Desk Lamp"
                value={60}
                unit="%"
                isActive={officeLight}
                onClick={() => setOfficeLight(!officeLight)}
              />
              <DeviceTile
                icon={Lightbulb}
                name="Ceiling"
                isActive={gardenLight}
                onClick={() => setGardenLight(!gardenLight)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="climate" className="space-y-6 pb-20">
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Living Room</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onSelectThermostat}
                className="relative overflow-hidden rounded-2xl bg-primary p-4 shadow-[0_0_20px_rgba(91,124,255,0.4)] transition-all hover:scale-105"
              >
                <div className="flex flex-col items-start gap-3">
                  <div className="rounded-xl bg-white/20 p-2">
                    <Thermometer className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl text-white">26</span>
                      <span className="text-sm text-white/70">°C</span>
                    </div>
                    <span className="text-sm text-white/90">Thermostat</span>
                  </div>
                </div>
              </button>
              <DeviceTile
                icon={Wind}
                name="Fan"
                value={3}
                unit="speed"
                isActive={livingFan}
                onClick={() => setLivingFan(!livingFan)}
              />
            </div>
          </div>
          
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Bedroom</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Thermometer}
                name="Thermostat"
                value={22}
                unit="°C"
                isActive={bedroomThermostat}
                onClick={() => setBedroomThermostat(!bedroomThermostat)}
              />
              <DeviceTile
                icon={Wind}
                name="AC"
                value={20}
                unit="°C"
                isActive={false}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Kitchen</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Thermometer}
                name="Sensor"
                value={24}
                unit="°C"
                isActive={kitchenThermostat}
                onClick={() => setKitchenThermostat(!kitchenThermostat)}
              />
              <DeviceTile
                icon={Wind}
                name="Ventilation"
                isActive={true}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="windows" className="space-y-6 pb-20">
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Living Room</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Wind}
                name="Main Window"
                value={100}
                unit="%"
                isActive={true}
              />
              <DeviceTile
                icon={Wind}
                name="Side Window"
                value={50}
                unit="%"
                isActive={false}
              />
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Bedroom</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Wind}
                name="Shutters"
                value={75}
                unit="%"
                isActive={true}
              />
              <DeviceTile
                icon={Wind}
                name="Curtains"
                value={0}
                unit="%"
                isActive={false}
              />
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Office</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Wind}
                name="Blinds"
                value={60}
                unit="%"
                isActive={true}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-6 pb-20">
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Living Room</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Tv}
                name="Smart TV"
                isActive={tvActive}
                onClick={() => setTvActive(!tvActive)}
              />
              <DeviceTile
                icon={Speaker}
                name="Soundbar"
                isActive={soundbar}
                onClick={() => setSoundbar(!soundbar)}
              />
              <DeviceTile
                icon={Speaker}
                name="Smart Speaker"
                isActive={speaker}
                onClick={() => setSpeaker(!speaker)}
              />
              <DeviceTile
                icon={Wifi}
                name="Streaming"
                isActive={true}
              />
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Bedroom</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Tv}
                name="TV"
                isActive={bedroomTv}
                onClick={() => setBedroomTv(!bedroomTv)}
              />
              <DeviceTile
                icon={Speaker}
                name="Speaker"
                isActive={false}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 pb-20">
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Cameras</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Camera}
                name="Front Door"
                isActive={true}
              />
              <DeviceTile
                icon={Camera}
                name="Backyard"
                isActive={true}
              />
              <DeviceTile
                icon={Camera}
                name="Garage"
                isActive={true}
              />
              <DeviceTile
                icon={Camera}
                name="Living Room"
                isActive={false}
              />
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm text-muted-foreground">Locks</h3>
            <div className="grid grid-cols-2 gap-3">
              <DeviceTile
                icon={Lock}
                name="Front Door"
                isActive={true}
              />
              <DeviceTile
                icon={Lock}
                name="Back Door"
                isActive={true}
              />
              <DeviceTile
                icon={Lock}
                name="Garage"
                isActive={false}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}