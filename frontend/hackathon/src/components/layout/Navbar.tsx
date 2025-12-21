import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList
} from '@/components/ui/navigation-menu'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Navbar() {
    const { isAuthenticated, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogoutClick = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className="w-full flex justify-center">
            <NavigationMenu>
                <NavigationMenuList className="flex gap-6 justify-center">
                    {!isAuthenticated && (
                        <>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild>
                                    <Link to="/">Hackathons</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild>
                                    <Link to="/login">Log in</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </>
                    )}

                    {isAuthenticated && (
                        <>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild>
                                    <Link to="/">Hackathons</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <NavigationMenuLink asChild>
                                    <Link to="/admin">Admin</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <button
                                    type="button"
                                    onClick={handleLogoutClick}
                                    className="text-sm font-medium text-foreground hover:underline"
                                >
                                    Log out
                                </button>
                            </NavigationMenuItem>
                        </>
                    )}
                </NavigationMenuList>
            </NavigationMenu>
        </div>
    )
}
