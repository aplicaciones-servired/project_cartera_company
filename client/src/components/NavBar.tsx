import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { NavLink } from 'react-router-dom'
import UserInfo from './UserInfo'
import { useTheme } from '../context/ThemeContext'
import { Switch } from './ui'

const Links = [
  { link: '/', name: 'Inicio' },
  { link: '/detallado', name: 'Detallado' },
  { link: '/bases', name: 'Bases' },
  { link: '/Reportes', name: 'Reportes' },
  { link: '/ReportesWhatsApp', name: 'WhatsApp' }
]

const LinkComponent = ({ link, name }: { link: string, name: string }) => {
  return (
    <li className='dark:text-white font-medium hover:text-blue-600 dark:hover:text-blue-700 text-md xl:text-lg hover:underline'>
      <NavLink to={link}>{name}</NavLink>
    </li>
  )
}

export default function NavBar () {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { darkMode, toggleDarkMode } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        menuRef.current && !menuRef.current.contains(event.target as Node)
      ) {
        setVisible(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  return (
    <nav className='bg-gray-200 dark:bg-dark-tremor-brand-faint relative'>
      <ul className='flex items-center justify-around py-1'>
        <figure className=''>
          <img src="/gane.webp" alt="logo de gane" className='w-16 py-2 lg:w-22' loading='lazy' />
        </figure>

        <div className='flex gap-4'>
          {Links.map((link, index) => <LinkComponent key={index} link={link.link} name={link.name} />)}
        </div>

        <div>
          <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
        </div>

        <button className='bg-blue-700 rounded-full h-10 w-10 text-xl flex items-center justify-center cursor-pointer
           hover:bg-blue-500 dark:hover:bg-dark-tremor-brand-faint dark:bg-dark-tremor-brand-faint' ref={buttonRef}
          onClick={() => setVisible(!visible)} >
          <article className='font-semibold text-white flex gap-0.5'>
            <p>{user?.names.split(' ')[0].slice(0, 1).toUpperCase()}</p>
            <p>{user?.lastnames.split(' ')[0].slice(0, 1).toUpperCase()}</p>
          </article>
        </button>
      </ul>

      {visible && (
        <div ref={menuRef}
          className='absolute z-50 bg-white border shadow-md right-2 top-14 px-5 py-2 mt-1 rounded-md flex flex-col gap-1'>
          <UserInfo key={user?.id} user={user} />
        </div>
      )}
    </nav>
  )
}
