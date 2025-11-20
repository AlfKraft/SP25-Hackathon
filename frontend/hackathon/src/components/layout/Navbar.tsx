import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    NavigationMenuContent,
  } from "@/components/ui/navigation-menu"
import { Link } from "react-router-dom"
import { useHackathon } from "@/contexts/HackathonContext"

export default function Navbar() {
  const { hackathons, currentHackathon, setCurrentHackathon } = useHackathon();

  return (
    <NavigationMenu className="container mx-auto px-4 py-8">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            {currentHackathon ? currentHackathon.name : 'Select Hackathon'}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-3 p-4 w-[400px]">
              {hackathons.map((hackathon) => (
                <NavigationMenuLink
                  key={hackathon.id}
                  asChild
                  className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer ${
                    currentHackathon?.id === hackathon.id ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  onClick={() => setCurrentHackathon(hackathon)}
                >
                  <div>
                    <div className="text-sm font-medium leading-none">
                      {hackathon.name}
                    </div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                      {hackathon.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        hackathon.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        hackathon.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {hackathon.status}
                      </span>
                      <span>{hackathon.participants.length}/{hackathon.maxParticipants} participants</span>
                    </div>
                  </div>
                </NavigationMenuLink>
              ))}
              {/*This will open a popup at one point to create a new hackathon*/}
              <NavigationMenuLink asChild>
                <Link to="/create-hackathon">Create New Hackathon +</Link>
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link to="/">Home</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link to="/participants">Participants</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link to="/team-builder">Team builder</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}