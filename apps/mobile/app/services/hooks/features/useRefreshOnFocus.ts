import React from 'react'
 import { useFocusEffect } from '@react-navigation/native'
 
 export function useRefreshOnFocus<T>(refetch: () => Promise<T>) {
   const firstTimeRef = React.useRef(true)
   console.log("refresh");
   useFocusEffect(
     React.useCallback(() => {
       if (firstTimeRef.current) {
          firstTimeRef.current = false;
          return;
       }
 
       refetch()
     }, [refetch])
   )
 }